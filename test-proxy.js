#!/usr/bin/env node
/**
 * Test script to verify mubeng proxy integration
 * Run with: node test-proxy.js
 */

const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const https = require('https');
const fs = require('fs');

const MUBENG_URL = 'http://localhost:8088';
const TEST_URL = 'https://ipv4.webshare.io/';

// Read the mubeng certificate
let ca;
try {
	ca = fs.readFileSync('./mubeng-ca.pem');
	console.log('✓ Mubeng certificate loaded');
} catch (error) {
	console.error('✗ Failed to load mubeng-ca.pem');
	console.error('  Run ./setup-mubeng-cert.sh first');
	process.exit(1);
}

// Set Node to trust the mubeng certificate globally
process.env.NODE_EXTRA_CA_CERTS = './mubeng-ca.pem';

// Create HTTPS agent with proxy
const httpsAgent = new HttpsProxyAgent(MUBENG_URL);

console.log('\n=================================');
console.log('Testing Mubeng Proxy Integration');
console.log('=================================\n');

async function testProxy(iteration) {
	try {
		const response = await axios.get(TEST_URL, {
			httpsAgent,
			proxy: false,
			timeout: 10000
		});

		const ip = response.data.trim().split(',')[0];
		console.log(`Request ${iteration}: IP = ${ip}`);
		return ip;
	} catch (error) {
		console.error(`Request ${iteration} failed:`, error.message);
		throw error;
	}
}

async function runTests() {
	console.log('Making 5 requests to test proxy rotation...\n');

	const ips = [];
	for (let i = 1; i <= 5; i++) {
		const ip = await testProxy(i);
		ips.push(ip);
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	console.log('\n=================================');
	console.log('Results:');
	console.log('=================================');
	console.log(`Total requests: ${ips.length}`);
	console.log(`Unique IPs: ${new Set(ips).size}`);
	console.log(`IPs used: ${[...new Set(ips)].join(', ')}`);

	if (new Set(ips).size > 1) {
		console.log('\n✓ Proxy rotation working!');
	} else {
		console.log('\n⚠ All requests used the same IP (rotation may not be working)');
	}
}

runTests().catch(error => {
	console.error('\n✗ Test failed:', error.message);
	process.exit(1);
});
