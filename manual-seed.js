// MongoDB shell commands to manually insert the manager
// Connect to your MongoDB instance and run these commands:

use('ecinema-scheduling');

// Insert the MGR001 manager
db.managers.insertOne({
  code: 'MGR001',
  name: 'Hoang Van Manager',
  level: 'middle',
  email: 'manager.hoang@cinema.com',
  phone: '0901234571',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Verify the insert
db.managers.findOne({ code: 'MGR001' });
