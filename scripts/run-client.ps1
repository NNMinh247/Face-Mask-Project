# Run the frontend (client)
Set-Location -Path (Join-Path $PSScriptRoot '..\client')

# install deps if needed
npm install

# run dev server
npm run dev
