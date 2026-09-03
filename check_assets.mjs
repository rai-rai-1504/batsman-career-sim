import fs from 'fs';
import path from 'path';

console.log('Checking all model and animation files in public/...');

function checkFile(relPath) {
  const full = path.resolve('public', relPath);
  const exists = fs.existsSync(full);
  const size = exists ? fs.statSync(full).size : 0;
  console.log(`- ${relPath}: ${exists ? `EXISTS (${size} bytes)` : 'MISSING'}`);
  return exists;
}

checkFile('models/player.glb');
checkFile('models/character.glb');
checkFile('models/animations/standing_idle.glb');
checkFile('models/animations/baseball_idle.glb');
checkFile('models/animations/standing_jump_running.glb');
checkFile('models/animations/baseball_pitching.glb');
checkFile('models/animations/baseball_strike.glb');
checkFile('models/animations/idle.glb');
