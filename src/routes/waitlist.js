const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { asyncHandler } = require('../middleware/errorHandler');
const { query } = require('../config/database');
const { success } = require('../utils/response');

const router = Router();

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /v1/waitlist
 * Add email to waitlist
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Valid email address required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
      await query(
        `INSERT INTO waitlist (id, email) VALUES ($1, $2)`,
        [uuidv4(), normalizedEmail]
      );

      res.status(201).json(
        success({
          message: 'Successfully added to waitlist!',
          email: normalizedEmail,
        })
      );
    } catch (err) {
      // Unique constraint violation - email already exists
      if (err.code === '23505') {
        return res.json(
          success({
            message: 'Already registered on waitlist',
            email: normalizedEmail,
          })
        );
      }
      throw err;
    }
  })
);

/**
 * GET /v1/waitlist/count
 * Get waitlist count (public metric)
 */
router.get(
  '/count',
  asyncHandler(async (req, res) => {
    const result = await query('SELECT COUNT(*) as count FROM waitlist');
    res.json(
      success({
        count: parseInt(result.rows[0].count, 10),
      })
    );
  })
);

module.exports = router;
