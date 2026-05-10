import fs from 'node:fs/promises'
import { globby } from 'globby'
import { minify } from 'html-minifier-terser'

// Path yang akan diproses (HANYA file HTML di project root)
const files = await globby('**/*.html', {
  ignore: [
    'node_modules/**',      // Abaikan node_modules
    '.vercel/**',           // Abaikan folder vercel
    '**/nw-pre-gyp/**',     // Abaikan folder aneh ini
    '**/tools/**'           // Abaikan folder tools
  ],
  absolute: false
})

console.log(`📁 Found ${files.length} HTML files to process`)
console.log('Files:', files)

for (const file of files) {
  console.log(`📄 Processing: ${file}`)
  try {
    let html = await fs.readFile(file, 'utf-8')
    
    const minified = await minify(html, {
      removeComments: true,
      collapseWhitespace: true,
      removeAttributeQuotes: false,
      minifyJS: true,
      minifyCSS: true
    })
    
    await fs.writeFile(file, minified)
    console.log(`   ✅ Done: ${file}`)
  } catch (err) {
    console.log(`   ⚠️ Skip (error): ${file}`)
  }
}

console.log(`🎉 Selesai! ${files.length} file HTML diproses.`)
