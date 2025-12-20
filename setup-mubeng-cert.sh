#!/bin/bash
# Script to download and install mubeng CA certificate

set -e

echo "==================================="
echo "Mubeng CA Certificate Setup"
echo "==================================="
echo ""

# Step 1: Start mubeng container
echo "1. Starting mubeng container..."
docker compose up -d mubeng
sleep 3

# Step 2: Download the certificate (DER format)
echo "2. Downloading mubeng CA certificate..."
curl -o mubeng-ca.crt http://localhost:8088/cert
echo "   ✓ Certificate downloaded to mubeng-ca.crt (DER format)"
echo ""

# Step 3: Convert to PEM format
echo "3. Converting certificate to PEM format..."
openssl x509 -inform DER -in mubeng-ca.crt -out mubeng-ca.pem
echo "   ✓ Certificate converted to mubeng-ca.pem"
echo ""

# Step 4: Display certificate info
echo "4. Certificate information:"
openssl x509 -in mubeng-ca.pem -text -noout | grep -A2 "Subject:"
echo ""

# Step 5: Test the proxy
echo "5. Testing HTTPS through mubeng proxy..."
TEST_IP=$(curl --cacert mubeng-ca.pem -x http://localhost:8088 https://ipv4.webshare.io/ 2>/dev/null | cut -d',' -f1)
echo "   ✓ Proxy working! Current IP: $TEST_IP"
echo ""

echo "==================================="
echo "Setup Complete!"
echo "==================================="
echo ""
echo "The certificate has been saved to:"
echo "  - mubeng-ca.crt (DER format)"
echo "  - mubeng-ca.pem (PEM format)"
echo ""
echo "Now restart your services:"
echo "  docker compose up -d"
echo ""
