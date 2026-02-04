# Check if host is provided as a command line argument
if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi
host=$1

CONFIG=$(node print-config.js)

ADMIN_EMAIL=$(echo $CONFIG | jq -r '.adminEmail')
ADMIN_PASSWORD=$(echo $CONFIG | jq -r '.adminPassword')

DINER_EMAIL=$(echo $CONFIG | jq -r '.dinerEmail')
DINER_PASSWORD=$(echo $CONFIG | jq -r '.dinerPassword')

FRANCHISE_EMAIL=$(echo $CONFIG | jq -r '.franchiseEmail')
FRANCHISE_PASSWORD=$(echo $CONFIG | jq -r '.franchisePassword')

response=$(curl -s -X PUT $host/api/auth -H 'Content-Type: application/json' -d '{"email":"$ADMIN_EMAIL", "password":"$ADMIN_PASSWORD"}')token=$(echo $response | jq -r '.token')

# Add users
curl -X POST $host/api/auth  -d '{"name":"pizza diner", "email":"$DINER_EMAIL", "password":"$DINER_PASSWORD"}' -H 'Content-Type: application/json'
curl -X POST $host/api/auth -d '{"name":"pizza franchisee", "email":"$FRANCHISE_EMAIL", "password":"$FRANCHISE_PASSWORD"}' -H 'Content-Type: application/json'

# Add menu
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Veggie", "description": "A garden of delight", "image":"pizza1.png", "price": 0.0038 }'  -H "Authorization: Bearer $token"
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Pepperoni", "description": "Spicy treat", "image":"pizza2.png", "price": 0.0042 }'  -H "Authorization: Bearer $token"
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Margarita", "description": "Essential classic", "image":"pizza3.png", "price": 0.0042 }'  -H "Authorization: Bearer $token"
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Crusty", "description": "A dry mouthed favorite", "image":"pizza4.png", "price": 0.0028 }'  -H "Authorization: Bearer $token"
curl -X PUT $host/api/order/menu -H 'Content-Type: application/json' -d '{ "title":"Charred Leopard", "description": "For those with a darker side", "image":"pizza5.png", "price": 0.0099 }'  -H "Authorization: Bearer $token"

# Add franchise and store
curl -X POST $host/api/franchise -H 'Content-Type: application/json' -d '{"name": "pizzaPocket", "admins": [{"email": "$FRANCHISE_EMAIL"}]}'  -H "Authorization: Bearer $token"
curl -X POST $host/api/franchise/1/store -H 'Content-Type: application/json' -d '{"franchiseId": 1, "name":"SLC"}'  -H "Authorization: Bearer $token"

echo "Database data generated"