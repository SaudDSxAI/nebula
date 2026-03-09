const axios = require('axios');
console.log(axios.getUri({ baseURL: 'https://backend.com/api', url: '/api/admin' }));
console.log(axios.getUri({ baseURL: 'https://backend.com', url: '/api/admin' }));
