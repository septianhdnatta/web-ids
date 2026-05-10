import fs from 'node:fs/promises'
import { globby } from 'globby'
import { minify } from 'html-minifier'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Coba beberapa kemungkinan path
let searchPaths = [
    join(__dirname, '.vercel/output/static'),
    join(__dirname, '..', '.vercel/output/static'),
    process.cwd(),
    __dirname
]

let files = []
for (const searchPath of searchPaths) {
    try {
        const found = await globby(`${searchPath}/**/*.html`, {
            absolute: true,
            dot: false
        })
        if (found.length > 0) {
            files = found
            console.log(`📁 Found ${files.length} HTML files in: ${searchPath}`)
            break
        }
    } catch (e) {
        // Path tidak ditemukan, coba yang lain
    }
}

// Kalau masih kosong, cari dari root project
if (files.length === 0) {
    console.log('📁 Searching from project root...')
    files = await globby('**/*.html', {
        ignore: ['node_modules/**', '.vercel/**'],
        absolute: true
    })
    console.log(`📁 Found ${files.length} HTML files from root`)
}

if (files.length === 0) {
    console.log('⚠️ Tidak ada file HTML yang ditemukan!')
    process.exit(0)
}

await Promise.all(
    files.map(async (file) => {
        console.log('📄 Processing:', file.split('/').slice(-2).join('/'))
        let html = await fs.readFile(file, 'utf-8')

        html = minify(html, {
            removeComments: true,
            collapseWhitespace: true,
            removeAttributeQuotes: false,
            removeOptionalTags: false,
            minifyJS: true,
            minifyCSS: true,
            removeRedundantAttributes: true,
            useShortDoctype: true,
            removeEmptyAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true
        })

        await fs.writeFile(file, html)
        console.log('   ✅ Done')
    })
)

console.log(`🎉 Selesai! ${files.length} file HTML telah di-minify.`)
