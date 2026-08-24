import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';

const router = Router();

// ── Get Profile ────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await db('profiles').where({ user_id: req.userId }).first();
    const user = await db('users').where({ id: req.userId }).first();
    res.json({
      success: true,
      data: {
        ...profile,
        name: user?.name,
        email: user?.email,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

// ── Update Profile ─────────────────────────────────────────────
router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, ...profileData } = req.body;

    if (name || email) {
      const updateUser: any = {};
      if (name) updateUser.name = name;
      if (email) updateUser.email = email;
      updateUser.updated_at = new Date().toISOString();
      await db('users').where({ id: req.userId }).update(updateUser);
    }

    if (Object.keys(profileData).length > 0) {
      const dbFields: any = {};
      if (profileData.dateOfBirth !== undefined) dbFields.date_of_birth = profileData.dateOfBirth;
      if (profileData.gender !== undefined) dbFields.gender = profileData.gender;
      if (profileData.maritalStatus !== undefined) dbFields.marital_status = profileData.maritalStatus;
      if (profileData.dependents !== undefined) dbFields.dependents = profileData.dependents;
      if (profileData.city !== undefined) dbFields.city = profileData.city;
      if (profileData.employmentType !== undefined) dbFields.employment_type = profileData.employmentType;
      if (profileData.employer !== undefined) dbFields.employer = profileData.employer;
      if (profileData.riskPreference !== undefined) dbFields.risk_preference = profileData.riskPreference;
      if (profileData.onboardingCompleted !== undefined) dbFields.onboarding_completed = profileData.onboardingCompleted;
      dbFields.updated_at = new Date().toISOString();

      await db('profiles').where({ user_id: req.userId }).update(dbFields);
    }

    const updatedProfile = await db('profiles').where({ user_id: req.userId }).first();
    const updatedUser = await db('users').where({ id: req.userId }).first();
    res.json({
      success: true,
      data: { ...updatedProfile, name: updatedUser?.name, email: updatedUser?.email },
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

export default router;
