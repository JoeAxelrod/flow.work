// Node.js script to test the hook endpoint
// Usage: node test-hook.js

const baseUrl = "http://localhost:3001";
const slug = "my-workflow";
const key = "s1";
const instanceId = "550e8400-e29b-41d4-a716-446655440000";

const body = {
    instanceId: instanceId,
    data: {
        message: "test hook data",
        value: 123
    }
};

const uri = `${baseUrl}/api/v1/hook/workflow/${slug}/station/${key}`;

console.log(`\x1b[36mSending POST request to: ${uri}\x1b[0m`);
console.log(`\x1b[90mBody: ${JSON.stringify(body, null, 2)}\x1b[0m`);

async function testHook() {
    try {
        const response = await fetch(uri, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            const responseData = await response.json();
            console.log(`\x1b[32mSuccess! Response:\x1b[0m`);
            console.log(JSON.stringify(responseData, null, 2));
        } else {
            const errorText = await response.text();
            console.log(`\x1b[31mError: HTTP ${response.status} ${response.statusText}\x1b[0m`);
            if (errorText) {
                console.log(`\x1b[33mResponse body: ${errorText}\x1b[0m`);
            }
        }
    } catch (error) {
        console.log(`\x1b[31mError: ${error.message}\x1b[0m`);
    }
}

testHook();

