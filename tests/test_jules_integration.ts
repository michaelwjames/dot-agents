import { JulesClient } from '../backend/src/core/lib/clients/jules_client.js';
import { JulesTool } from '../backend/src/core/lib/tools/jules.js';
import assert from 'assert';

async function testJulesClient() {
  console.log('Testing JulesClient instantiation...');
  const client = new JulesClient('test-key');
  assert(client instanceof JulesClient, 'JulesClient should be instantiated');
  console.log('JulesClient instantiation test passed!');
}

async function testJulesTool() {
  console.log('Testing JulesTool instantiation...');
  const tool = new JulesTool();
  assert(tool instanceof JulesTool, 'JulesTool should be instantiated');
  assert(tool.definition.function.name === 'jules', 'JulesTool should have correct name');
  console.log('JulesTool instantiation test passed!');
}

async function runTests() {
  try {
    await testJulesClient();
    await testJulesTool();
    console.log('All Jules integration tests passed!');
  } catch (error) {
    console.error('Jules integration tests failed:', error);
    process.exit(1);
  }
}

runTests();
