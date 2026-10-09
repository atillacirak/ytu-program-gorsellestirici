import os

file_path = 'frontend/src/components/Header.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { usePathname, useSearchParams } from 'next/navigation';", "import { usePathname } from 'next/navigation';")
content = content.replace("  const searchParams = useSearchParams();\n  const tab = searchParams.get('tab');\n  \n", "")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Header.tsx")
