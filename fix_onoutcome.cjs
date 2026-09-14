const fs = require('fs');

const dirs = ['./src/games', './src/games/SliceStorm'];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

  files.forEach(file => {
    const filepath = `${dir}/${file}`;
    let content = fs.readFileSync(filepath, 'utf-8');
    
    if (content.includes('onOutcome?.')) {
      let modified = false;
      
      const newContent = content.replace(/onOutcome\?\.\(\{\s*type:\s*[^,]+,\s*score[^}]*\}\);?/g, match => {
        modified = true;
        let core = match.trim();
        if (core.endsWith(';')) core = core.slice(0, -1);
        return `setTimeout(() => ${core}, 0);`;
      });
      
      if (modified) {
        fs.writeFileSync(filepath, newContent);
        console.log(`Updated ${filepath}`);
      }
    }
  });
});
