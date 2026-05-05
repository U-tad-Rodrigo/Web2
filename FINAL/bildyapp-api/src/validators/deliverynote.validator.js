import { z } from 'zod';

const workerSchema = z.object({
  name:  z.string().trim().min(1),
  hours: z.number().min(0)
});

export const createDeliveryNoteSchema = z.object({
  client:      z.string().min(1, 'El cliente es obligatorio'),
  project:     z.string().min(1, 'El proyecto es obligatorio'),
  format:      z.enum(['material', 'hours']),
  description: z.string().trim().optional(),
  workDate:    z.coerce.date({ required_error: 'La fecha de trabajo es obligatoria' }),
  // Material
  material: z.string().trim().optional(),
  quantity: z.number().min(0).optional(),
  unit:     z.string().trim().optional(),
  // Hours
  hours:   z.number().min(0).optional(),
  workers: z.array(workerSchema).optional()
}).superRefine((data, ctx) => {
  if (data.format === 'material' && !data.material) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El material es obligatorio para albaranes de tipo material',
      path: ['material']
    });
  }
  if (data.format === 'hours' && data.hours == null && (!data.workers || data.workers.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Se requieren horas o trabajadores para albaranes de tipo horas',
      path: ['hours']
    });
  }
});
