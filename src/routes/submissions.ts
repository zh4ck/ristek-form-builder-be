import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/submissions/:formId/form - Fetch a published form for respondents (PUBLIC Route)
router.get('/:formId/form', async (req: Request, res: Response): Promise<void> => {
    try {
        const formId = req.params.formId as string;

        const form = await prisma.form.findUnique({
            where: { id: formId },
            include: {
                questions: {
                    orderBy: { orderIndex: 'asc' },
                    include: { options: true },
                },
            },
        });

        if (!form) {
            res.status(404).json({ error: 'Form not found.' });
            return;
        }

        if (!form.isPublished) {
            res.status(403).json({ error: 'This form is not currently accepting responses.' });
            return;
        }

        res.status(200).json(form);
    } catch (error) {
        console.error('Error fetching public form:', error);
        res.status(500).json({ error: 'Failed to fetch form' });
    }
});

// POST /api/submissions/:formId - Submit answers to a specific form (PUBLIC Route)
router.post('/:formId', async (req: Request, res: Response): Promise<void> => {
    try {
        const formId = req.params.formId as string;
        const { answers } = req.body; // Expects array: [{ questionId: string, value: string }]

        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            res.status(400).json({ error: 'Answers payload is required and must be an array.' });
            return;
        }

        // 1. Verify that the Form exists AND is published
        const form = await prisma.form.findUnique({
            where: { id: formId },
        });

        if (!form) {
            res.status(404).json({ error: 'Form not found.' });
            return;
        }

        if (!form.isPublished) {
            res.status(403).json({ error: 'This form is not currently accepting responses.' });
            return;
        }

        // 2. Map answers logic and create Submission -> Answers simultaneously
        const submission = await prisma.submission.create({
            data: {
                formId,
                answers: {
                    create: answers.map((ans: { questionId: string; value: string }) => ({
                        questionId: ans.questionId,
                        value: ans.value,
                    })),
                },
            },
            include: {
                answers: true,
            },
        });

        res.status(201).json({
            message: 'Submission recorded successfully',
            submissionId: submission.id,
        });
    } catch (error) {
        console.error('Error submitting form:', error);
        res.status(500).json({ error: 'Failed to record submission' });
    }
});

export default router;
