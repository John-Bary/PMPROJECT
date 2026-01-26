/**
 * Test script for email service
 * Run with: node scripts/testEmail.js
 *
 * Make sure you have configured EMAIL_* environment variables in .env
 */

require('dotenv').config();
const { verifyConnection, sendTaskReminder, sendMultipleTasksReminder } = require('../utils/emailService');

const TEST_EMAIL = process.argv[2] || process.env.EMAIL_USER;

async function testEmailService() {
  console.log('\n📧 Testing Arena PM Tool Email Service\n');
  console.log('=' .repeat(50));

  // Check if email config exists
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('\n❌ Error: EMAIL_USER and EMAIL_PASSWORD must be set in .env file');
    console.log('\nExample .env configuration:');
    console.log('  EMAIL_HOST=smtp.gmail.com');
    console.log('  EMAIL_PORT=587');
    console.log('  EMAIL_USER=your_email@gmail.com');
    console.log('  EMAIL_PASSWORD=your_app_password');
    console.log('\nNote: For Gmail, use an App Password (not your regular password)');
    console.log('Create one at: https://myaccount.google.com/apppasswords\n');
    process.exit(1);
  }

  console.log('\n1. Verifying email connection...');
  const isConnected = await verifyConnection();

  if (!isConnected) {
    console.error('\n❌ Failed to connect to email server');
    console.log('Please check your EMAIL_* settings in .env\n');
    process.exit(1);
  }

  console.log('\n2. Sending single task reminder...');
  const singleResult = await sendTaskReminder({
    to: TEST_EMAIL,
    userName: 'Test User',
    taskName: 'Complete project documentation',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    taskDescription: 'Write comprehensive documentation for the Arena PM Tool project including API endpoints and user guide.',
    priority: 'high'
  });

  if (singleResult.success) {
    console.log('   ✅ Single task reminder sent successfully');
  } else {
    console.log('   ❌ Failed:', singleResult.error);
  }

  console.log('\n3. Sending multiple tasks reminder...');
  const multiResult = await sendMultipleTasksReminder({
    to: TEST_EMAIL,
    userName: 'Test User',
    tasks: [
      {
        name: 'Review pull request',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: 'high'
      },
      {
        name: 'Update dependencies',
        due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        priority: 'medium'
      },
      {
        name: 'Write unit tests',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        priority: 'low'
      }
    ]
  });

  if (multiResult.success) {
    console.log('   ✅ Multiple tasks reminder sent successfully');
  } else {
    console.log('   ❌ Failed:', multiResult.error);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('\n✅ Email service test completed!');
  console.log(`\nCheck ${TEST_EMAIL} for the test emails.\n`);
}

testEmailService().catch(console.error);
