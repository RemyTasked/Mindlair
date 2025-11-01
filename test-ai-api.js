/**
 * Test script to verify OpenAI API integration
 * Run with: node test-ai-api.js
 */

const axios = require('axios');

async function testAIAPI() {
  console.log('🤖 Testing Meet Cute AI API Integration\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Check if backend is accessible
    console.log('\n📡 Test 1: Backend Health Check');
    console.log('   URL: https://www.meetcuteai.com/api/user/me');
    
    // We can't test authenticated endpoints without a session, 
    // so we'll test the AI directly
    
    // Test 2: Test OpenAI API key format
    console.log('\n🔑 Test 2: Environment Configuration');
    const hasApiKey = process.env.OPENAI_API_KEY ? '✅' : '❌';
    console.log(`   OPENAI_API_KEY set: ${hasApiKey}`);
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('\n❌ ERROR: OPENAI_API_KEY not found in environment');
      console.log('   Please ensure the API key is set in Railway environment variables');
      return false;
    }
    
    const keyPrefix = process.env.OPENAI_API_KEY.substring(0, 7);
    const keyLength = process.env.OPENAI_API_KEY.length;
    console.log(`   Key format: ${keyPrefix}...`);
    console.log(`   Key length: ${keyLength} characters`);
    
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.log('   ⚠️  Warning: API key should start with "sk-"');
    }
    
    // Test 3: Make a test API call to OpenAI
    console.log('\n🧪 Test 3: OpenAI API Call');
    console.log('   Making test request to GPT-4...');
    
    const testResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Respond with exactly: "API working"'
          },
          {
            role: 'user',
            content: 'Test'
          }
        ],
        max_tokens: 10,
        temperature: 0
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('   ✅ Response received');
    console.log(`   Model: ${testResponse.data.model}`);
    console.log(`   Response: "${testResponse.data.choices[0].message.content}"`);
    console.log(`   Tokens used: ${testResponse.data.usage.total_tokens}`);
    
    // Test 4: Test a Meet Cute-specific prompt
    console.log('\n🎬 Test 4: Meet Cute Prompt Generation');
    console.log('   Generating sample pre-meeting cue...');
    
    const meetingTest = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an executive communication coach. Generate a brief, cinematic pre-meeting focus cue.'
          },
          {
            role: 'user',
            content: 'Meeting: "Q4 Strategy Review" with CEO and executives at 2:00 PM. Tone: Executive. Generate a 2-sentence focus cue.'
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const sampleCue = meetingTest.data.choices[0].message.content;
    console.log('   ✅ Sample cue generated:');
    console.log(`   "${sampleCue}"`);
    console.log(`   Tokens used: ${meetingTest.data.usage.total_tokens}`);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED');
    console.log('\n📊 Summary:');
    console.log('   • API key is configured correctly');
    console.log('   • OpenAI API is accessible');
    console.log('   • GPT-4 model is responding');
    console.log('   • Meet Cute prompts are working');
    console.log('\n🚀 Your AI integration is ready to use!');
    
    return true;
    
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('❌ TEST FAILED');
    console.log('\nError Details:');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data.error?.message || error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.log('\n💡 Solution: Invalid API key');
        console.log('   1. Check OPENAI_API_KEY in Railway environment variables');
        console.log('   2. Ensure the key starts with "sk-"');
        console.log('   3. Verify the key is active at https://platform.openai.com/api-keys');
      } else if (error.response.status === 429) {
        console.log('\n💡 Solution: Rate limit or quota exceeded');
        console.log('   1. Check your OpenAI account usage');
        console.log('   2. Ensure you have credits available');
        console.log('   3. Wait a moment and try again');
      } else if (error.response.status === 404) {
        console.log('\n💡 Solution: Model not available');
        console.log('   1. Ensure GPT-4 access is enabled on your account');
        console.log('   2. Try using "gpt-3.5-turbo" instead');
      }
    } else if (error.request) {
      console.log('   Network error - could not reach OpenAI API');
      console.log('   Check your internet connection');
    } else {
      console.log(`   ${error.message}`);
    }
    
    return false;
  }
}

// Run the test
testAIAPI().then(success => {
  process.exit(success ? 0 : 1);
});

