import { prisma } from '../index';

async function addDefaultCharLimit() {
  try {
    // Check if the setting already exists
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key: 'default_char_limit' }
    });

    if (existingSetting) {
      console.log('✅ Default character limit setting already exists');
      console.log(`Current value: ${existingSetting.value}`);
      return;
    }

    // Add the default character limit setting
    const setting = await prisma.systemSettings.create({
      data: {
        key: 'default_char_limit',
        value: '500',
        description: 'Default character limit for text variables in templates',
        category: 'system',
        isPublic: false
      }
    });

    console.log('✅ Default character limit setting added successfully');
    console.log(`Key: ${setting.key}`);
    console.log(`Value: ${setting.value}`);
    console.log(`Description: ${setting.description}`);
  } catch (error) {
    console.error('❌ Error adding default character limit setting:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addDefaultCharLimit(); 