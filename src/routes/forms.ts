import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/authMiddleware';
import questionsRouter from './questions';

const router = Router();

// Protect all routes in this file
router.use(authenticateToken);

// Mount the nested questions router
// This means any request to /api/forms/:formId/questions goes to questions.ts
router.use('/:formId/questions', questionsRouter);

// GET /api/forms/:id/submissions - Get all submissions for a specific form
router.get('/:id/submissions', async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req.user as any).userId;
        const formId = req.params.id as string;

        // Verify the user actually owns this form first
        const form = await prisma.form.findFirst({
            where: { id: formId, creatorId: userId },
        });

        if (!form) {
            res.status(404).json({ error: 'Form not found or unauthorized' });
            return;
        }

        const submissions = await prisma.submission.findMany({
            where: { formId },
            include: {
                answers: {
                    include: {
                        question: {
                            select: {
                                text: true,
                                type: true,
                            }
                        }
                    }
                }
            },
            orderBy: {
                submittedAt: 'desc',
            }
        });

        res.status(200).json(submissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

// GET /api/forms - List forms logically sorted and optionally searched
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req.user as any).userId;
        const { search, sort } = req.query;

        const forms = await prisma.form.findMany({
            where: {
                creatorId: userId,
                ...(search ? { title: { contains: search as string, mode: 'insensitive' } } : {}),
            },
            orderBy: {
                createdAt: sort === 'asc' ? 'asc' : 'desc',
            },
            select: {
                id: true,
                title: true,
                description: true,
                isPublished: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { submissions: true },
                },
            },
        });

        res.status(200).json(forms);
    } catch (error) {
        console.error('Error fetching forms:', error);
        res.status(500).json({ error: 'Failed to fetch forms' });
    }
});

// POST /api/forms - Create an empty form
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req.user as any).userId;

        const newForm = await prisma.form.create({
            data: {
                title: 'Untitled Form',
                description: '',
                creatorId: userId,
            },
        });

        res.status(201).json(newForm);
    } catch (error) {
        console.error('Error creating form:', error);
        res.status(500).json({ error: 'Failed to create form' });
    }
});

// GET /api/forms/:id - Get a specific form with questions and options
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req.user as any).userId;
        const formId = req.params.id as string;

        const form = await prisma.form.findFirst({
            where: {
                id: formId,
                creatorId: userId,
            },
            include: {
                questions: {
                    orderBy: {
                        orderIndex: 'asc',
                    },
                    include: {
                        options: true,
                    },
                },
            },
        });

        if (!form) {
            res.status(404).json({ error: 'Form not found or unauthorized' });
            return;
        }

        res.status(200).json(form);
    } catch (error) {
        console.error('Error fetching form:', error);
        res.status(500).json({ error: 'Failed to fetch form' });
    }
});

// PUT /api/forms/:id - Update form details and fully sync nested questions structure
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req.user as any).userId;
        const formId = req.params.id as string;
        const { title, description, isPublished, questions } = req.body;

        // First ensure ownership
        const existingForm = await prisma.form.findFirst({
            where: { id: formId, creatorId: userId },
        });

        if (!existingForm) {
            res.status(404).json({ error: 'Form not found or unauthorized' });
            return;
        }

        // If 'questions' array is provided, we perform a massive synchronized wipe and replace
        // This is necessary for accurate Drag n Drop sorting and nested array mutations dynamically
        if (questions && Array.isArray(questions)) {
            // Normalize frontend type strings (e.g. 'multiple_choice') to Prisma enum values (e.g. 'MULTIPLE_CHOICE')
            const normalizeType = (type: string) => {
                return type.toUpperCase() as any;
            };

            const updateTrx = await prisma.$transaction([
                // 1. Wipe old questions cleanly (Options cascade delete natively)
                prisma.question.deleteMany({
                    where: { formId }
                }),
                // 2. Transact the core form updates while creating infinite new nested relationships
                prisma.form.update({
                    where: { id: formId },
                    data: {
                        ...(title !== undefined && { title }),
                        ...(description !== undefined && { description }),
                        ...(isPublished !== undefined && { isPublished }),
                        questions: {
                            create: questions.map((q: any, index: number) => ({
                                text: q.text,
                                type: normalizeType(q.type),
                                isRequired: q.isRequired ?? false,
                                orderIndex: index, // Enforce strict array ordering explicitly
                                options: {
                                    create: q.options && Array.isArray(q.options)
                                        ? q.options.map((opt: any) => ({ text: opt.text }))
                                        : []
                                }
                            })) as any
                        }
                    },
                    include: {
                        questions: {
                            include: { options: true },
                            orderBy: { orderIndex: 'asc' }
                        }
                    }
                })
            ]);

            res.status(200).json(updateTrx[1]);
        } else {
            // Standard shallow update fallback
            const updatedForm = await prisma.form.update({
                where: { id: formId },
                data: {
                    ...(title !== undefined && { title }),
                    ...(description !== undefined && { description }),
                    ...(isPublished !== undefined && { isPublished }),
                },
            });
            res.status(200).json(updatedForm);
        }
    } catch (error) {
        console.error('Error updating form:', error);
        res.status(500).json({ error: 'Failed to update form' });
    }
});

// POST /api/forms/:id/duplicate - Deep-copy a form as a new unpublished draft
router.post('/:id/duplicate', async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req.user as any).userId;
        const formId = req.params.id as string;

        // Fetch the source form with all nested data
        const source = await prisma.form.findFirst({
            where: { id: formId, creatorId: userId },
            include: {
                questions: {
                    orderBy: { orderIndex: 'asc' },
                    include: { options: true },
                },
            },
        });

        if (!source) {
            res.status(404).json({ error: 'Form not found or unauthorized' });
            return;
        }

        // Create the duplicated form
        const duplicate = await prisma.form.create({
            data: {
                title: `Copy of ${source.title}`,
                description: source.description,
                isPublished: false,
                creatorId: userId,
                questions: {
                    create: source.questions.map((q) => ({
                        text: q.text,
                        type: q.type,
                        isRequired: q.isRequired,
                        orderIndex: q.orderIndex,
                        options: {
                            create: q.options.map((opt) => ({ text: opt.text })),
                        },
                    })),
                },
            },
        });

        res.status(201).json(duplicate);
    } catch (error) {
        console.error('Error duplicating form:', error);
        res.status(500).json({ error: 'Failed to duplicate form' });
    }
});

// DELETE /api/forms/:id - Delete a form
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = (req.user as any).userId;
        const formId = req.params.id as string;

        const existingForm = await prisma.form.findFirst({
            where: { id: formId, creatorId: userId },
        });

        if (!existingForm) {
            res.status(404).json({ error: 'Form not found or unauthorized' });
            return;
        }

        await prisma.form.delete({
            where: { id: formId },
        });

        res.status(200).json({ message: 'Form deleted successfully' });
    } catch (error) {
        console.error('Error deleting form:', error);
        res.status(500).json({ error: 'Failed to delete form' });
    }
});

export default router;
