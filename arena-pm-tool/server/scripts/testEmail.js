/**
 * Test script for email service
 * Run with: node scripts/testEmail.js [recipient-email]
 *
 * Make sure you have configured RESEND_API_KEY and EMAIL_FROM in .env
 */

require('dotenv').config();
const { verifyConnection, sendTaskReminder, sendMultipleTasksReminder } = require('../utils/emailService');

const TEST_EMAIL = process.argv[2] || process.env.EMAIL_FROM;

async function testEmailService() {
  console.log('\n📧 Testing Todoria Email Service (Resend)\n');
  console.log('=' .repeat(50));

  // Check if Resend config exists
  if (!process.env.RESEND_API_KEY) {
    console.error('\n❌ Error: RESEND_API_KEY must be set in .env file');
    console.log('\nExample .env configuration:');
    console.log('  RESEND_API_KEY=re_your_api_key_here');
    console.log('  EMAIL_FROM=noreply@yourdomain.com');
    console.log('  EMAIL_FROM_NAME=Todoria');
    console.log('\nGet your API key at: https://resend.com/api-keys\n');
    process.exit(1);
  }

  console.log('\n1. Verifying email connection...');
  const isConnected = await verifyConnection();

  if (!isConnected) {
    console.error('\n❌ Failed to verify Resend configuration');
    console.log('Please check your RESEND_API_KEY in .env\n');
    process.exit(1);
  }

  console.log('\n2. Sending single task reminder...');
  const singleResult = await sendTaskReminder({
    to: TEST_EMAIL,
    userName: 'Test User',
    taskName: 'Complete project documentation',
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    taskDescription: 'Write comprehensive documentation for the Todoria project including API endpoints and user guide.',
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
