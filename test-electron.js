const { app } = require('electron');

console.log('app:', typeof app);
console.log('app.whenReady:', typeof app.whenReady);

app.whenReady().then(() => {
  console.log('App is ready!');
  app.quit();
});