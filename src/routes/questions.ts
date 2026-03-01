import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

// MergeParams is crucial so this router can access :formId from the parent forms router path
const router = Router({ mergeParams: true });

// Middleware to verify that the logged-in user actually owns the form they are modifying questions for
const verifyFormOwnership = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const formId = req.params.formId as string;
    const userId = (req.user as any).userId;

    try {
        const form = await prisma.form.findFirst({
            where: { id: formId, creatorId: userId },
        });

        if (!form) {
            res.status(404).json({ error: 'Form not found or you do not have permission to modify it' });
            return;
        }

        next();
    } catch (error) {
        console.error('Ownership validation error:', error);
        res.status(500).json({ error: 'Internal server error validating form ownership' });
    }
};

// Apply ownership validation to all routes in this nested router
router.use(verifyFormOwnership);

// POST /api/forms/:formId/questions - Add a new question to the form
router.post('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const formId = req.params.formId as string;
        const { text, type, isRequired, orderIndex, options } = req.body;

        if (!text || !type || orderIndex === undefined) {
            res.status(400).json({ error: 'Missing required question fields (text, type, orderIndex).' });
            return;
        }

        // Use Prisma nested write feature to create question with options simultaneously
        const question = await prisma.question.create({
            data: {
                formId,
                text,
                type,
                isRequired: isRequired ?? false,
                orderIndex,
                options: {
                    create: options && Array.isArray(options)
                        ? options.map((optText: string) => ({ text: optText }))
                        : [],
                },
            },
            include: {
                options: true,
            }
        });

        res.status(201).json(question);
    } catch (error) {
        console.error('Error creating question:', error);
        res.status(500).json({ error: 'Failed to create question' });
    }
});

// PUT /api/forms/:formId/questions/:questionId - Update an existing question and its options
router.put('/:questionId', async (req: Request, res: Response): Promise<void> => {
    try {
        // The formId and questionId guarantees isolation within the specific form
        const formId = req.params.formId as string;
        const questionId = req.params.questionId as string;
        const { text, type, isRequired, orderIndex, options } = req.body;

        // First, confirm the question actually belongs to this form
        const existingQuestion = await prisma.question.findFirst({
            where: { id: questionId, formId },
        });

        if (!existingQuestion) {
            res.status(404).json({ error: 'Question not found on this form.' });
            return;
        }

        // To cleanly update options without complicated diffing, we use a Prisma transaction:
        // 1. Delete existing options
        // 2. Update the question and recreate the new options
        const updateTrx = await prisma.$transaction([
            prisma.option.deleteMany({
                where: { questionId },
            }),
            prisma.question.update({
                where: { id: questionId },
                data: {
                    ...(text !== undefined && { text }),
                    ...(type !== undefined && { type }),
                    ...(isRequired !== undefined && { isRequired }),
                    ...(orderIndex !== undefined && { orderIndex }),
                    options: {
                        create: options && Array.isArray(options)
                            ? options.map((optText: string) => ({ text: optText }))
                            : [],
                    },
                },
                include: {
                    options: true,
                },
            }),
        ]);

        // Return the result of the `question.update` call the transaction
        res.status(200).json(updateTrx[1]);
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({ error: 'Failed to update question' });
    }
});

// DELETE /api/forms/:formId/questions/:questionId - Remove a specific question
router.delete('/:questionId', async (req: Request, res: Response): Promise<void> => {
    try {
        const formId = req.params.formId as string;
        const questionId = req.params.questionId as string;

        const existingQuestion = await prisma.question.findFirst({
            where: { id: questionId, formId },
        });

        if (!existingQuestion) {
            res.status(404).json({ error: 'Question not found on this form.' });
            return;
        }

        await prisma.question.delete({
            where: { id: questionId },
        }); // Options cascade automatically

        res.status(200).json({ message: 'Question deleted successfully' });
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ error: 'Failed to delete question' });
    }
});

export default router;
