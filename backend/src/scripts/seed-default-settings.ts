import { prisma } from '../index';

const defaultSettings = [
  // General Settings
  {
    key: 'site_name',
    value: 'Content Generation Platform',
    description: 'The name of the website/platform',
    category: 'general' as const,
    isPublic: true,
  },
  {
    key: 'site_description',
    value: 'AI-powered content generation platform',
    description: 'Brief description of the platform',
    category: 'general' as const,
    isPublic: true,
  },
  {
    key: 'maintenance_mode',
    value: 'false',
    description: 'Whether the site is in maintenance mode',
    category: 'system' as const,
    isPublic: false,
  },

  // Security Settings
  {
    key: 'password_min_length',
    value: '8',
    description: 'Minimum password length required',
    category: 'security' as const,
    isPublic: false,
  },
  {
    key: 'jwt_expiration_hours',
    value: '24',
    description: 'JWT token expiration time in hours',
    category: 'security' as const,
    isPublic: false,
  },
  {
    key: 'max_login_attempts',
    value: '5',
    description: 'Maximum failed login attempts before lockout',
    category: 'security' as const,
    isPublic: false,
  },

  // Upload Settings
  {
    key: 'max_file_size_mb',
    value: '100',
    description: 'Maximum file upload size in MB',
    category: 'upload' as const,
    isPublic: true,
  },
  {
    key: 'allowed_file_types',
    value: 'mp4,avi,mov,jpg,jpeg,png,gif',
    description: 'Comma-separated list of allowed file types',
    category: 'upload' as const,
    isPublic: true,
  },
  {
    key: 'video_generation_limit',
    value: '10',
    description: 'Maximum videos a user can generate per day',
    category: 'upload' as const,
    isPublic: false,
  },

  // Email Settings
  {
    key: 'email_verification_required',
    value: 'true',
    description: 'Whether email verification is required for new users',
    category: 'email' as const,
    isPublic: false,
  },
  {
    key: 'welcome_email_enabled',
    value: 'true',
    description: 'Whether to send welcome emails to new users',
    category: 'email' as const,
    isPublic: false,
  },
  {
    key: 'password_reset_enabled',
    value: 'true',
    description: 'Whether password reset functionality is enabled',
    category: 'email' as const,
    isPublic: false,
  },

  // System Settings
  {
    key: 'rate_limit_requests',
    value: '100',
    description: 'Maximum API requests per time window',
    category: 'system' as const,
    isPublic: false,
  },
  {
    key: 'rate_limit_window_ms',
    value: '900000',
    description: 'Rate limiting time window in milliseconds (15 minutes)',
    category: 'system' as const,
    isPublic: false,
  },
  {
    key: 'debug_mode',
    value: 'false',
    description: 'Whether debug mode is enabled',
    category: 'system' as const,
    isPublic: false,
  },
];

async function seedDefaultSettings() {
  try {
    console.log('🌱 Seeding default system settings...');

    for (const setting of defaultSettings) {
      // Check if setting already exists
      const existingSetting = await prisma.systemSettings.findUnique({
        where: { key: setting.key }
      });

      if (existingSetting) {
        console.log(`⏭️  Setting "${setting.key}" already exists, skipping...`);
        continue;
      }

      // Create the setting
      await prisma.systemSettings.create({
        data: setting
      });

      console.log(`✅ Created setting: ${setting.key}`);
    }

    console.log('🎉 Default settings seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding default settings:', error);
    throw error;
  }
}

// Run the seed function if this file is executed directly
// if (require.main === module) {
//   seedDefaultSettings()
//     .then(() => {
//       console.log('✅ Seeding completed successfully');
//       process.exit(0);
//     })
//     .catch((error) => {
//       console.error('❌ Seeding failed:', error);
//       process.exit(1);
//     });
// }
seedDefaultSettings();
export { seedDefaultSettings }; 