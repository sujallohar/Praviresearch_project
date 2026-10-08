import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Strict Zod schema for public infrastructure assets
const AssetSchema = z.object({
  name: z.string().min(3, 'Asset name must be at least 3 characters').max(120, 'Asset name cannot exceed 120 characters'),
  type: z.enum(['Infrastructure', 'Facility', 'Fleet', 'Equipment', 'Utility', 'IT System']),
  departmentId: z.string().min(2, 'Department is required'),
  location: z.string().min(2, 'Location is required'),
  status: z.enum(['Operational', 'Under Maintenance', 'Decommissioned', 'Critical Failure']).default('Operational'),
  condition: z.enum(['Excellent', 'Good', 'Fair', 'Poor', 'Critical']),
  riskLevel: z.enum(['Low', 'Medium', 'High']),
  estimatedValue: z.number().nonnegative('Value must be positive').max(500000000, 'Value exceeds limit'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  description: z.string().max(1000).optional()
});

const BulkAssetRequestSchema = z.object({
  records: z.array(AssetSchema).min(1, 'At least 1 record required').max(100, 'Batch limit is 100 records per upload')
});

// Bulk Asset Validation Gateway Endpoint
router.post('/bulk-validate', (req, res) => {
  const result = BulkAssetRequestSchema.safeParse(req.body);

  if (!result.success) {
    const errorDetails = result.error.issues.map((err: z.ZodIssue) => ({
      path: err.path.join('.'),
      message: err.message
    }));

    res.status(400).json({
      success: false,
      error: 'Schema Validation Failed',
      message: 'One or more asset records failed strict engineering schema validation.',
      errors: errorDetails
    });
    return;
  }

  // Calculate batch analytics
  const totalValue = result.data.records.reduce((sum, r) => sum + r.estimatedValue, 0);
  const criticalCount = result.data.records.filter(r => r.condition === 'Critical' || r.riskLevel === 'High').length;

  res.status(200).json({
    success: true,
    message: `Batch validation successful: ${result.data.records.length} records verified.`,
    metrics: {
      totalRecords: result.data.records.length,
      totalPortfolioValue: totalValue,
      flaggedHighRisk: criticalCount,
      validatedAt: new Date().toISOString()
    },
    sanitizedRecords: result.data.records
  });
});

export default router;
