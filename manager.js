const pm2 = require('pm2');

// Connect to the PM2 daemon
pm2.connect((err) => {
  if (err) {
    console.error(err);
    process.exit(2);
  }

  // Get the list of running processes
  pm2.list((err, processes) => {
    if (err) {
      console.error(err);
      pm2.disconnect();
      process.exit(2);
    }

    // Display information about each running process
    processes.forEach((process) => {
      console.log(`Process ${process.name}:`);
      console.log(`  - ID: ${process.pm_id}`);
      console.log(`  - Status: ${process.pm2_env.status}`);
      console.log(`  - Restarted: ${process.pm2_env.restart_time}`);
      console.log('-----------------------');
    });

    // Disconnect from the PM2 daemon
    pm2.disconnect();
  });
});