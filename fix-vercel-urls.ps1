# ========================================================
# QUICK FIX: Update Vercel Environment Variables
# ========================================================
# This script updates the environment variables with the correct Vercel URL

$CURRENT_URL = "https://inspira-grid-jipbs4xwb-atharvingales-projects.vercel.app"

Write-Host "🔧 Fixing Vercel Environment Variables..." -ForegroundColor Green
Write-Host "Current Production URL: $CURRENT_URL" -ForegroundColor Yellow
Write-Host ""

# Function to update environment variable
function Update-VercelEnv {
    param(
        [string]$Name,
        [string]$Value
    )
    
    Write-Host "Updating: $Name" -ForegroundColor Cyan
    
    try {
        # Remove existing variable
        vercel env rm $Name --yes 2>$null
        
        # Add updated variable
        $result = vercel env add $Name production --value="$Value" --yes
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $Name updated successfully" -ForegroundColor Green
        } else {
            Write-Host "⚠️ $Name update may have failed" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ Error updating $Name" -ForegroundColor Red
    }
}

Write-Host "📋 Updating URL Environment Variables..." -ForegroundColor Blue
Write-Host ""

# Update URL-related environment variables
Update-VercelEnv "CLIENT_URL" $CURRENT_URL
Update-VercelEnv "REACT_APP_SERVER_URL" $CURRENT_URL
Update-VercelEnv "GITHUB_CALLBACK_URL" "$CURRENT_URL/api/auth/github/callback"

Write-Host ""
Write-Host "🔄 Redeploying to apply changes..." -ForegroundColor Blue

# Trigger a new deployment
vercel --prod

Write-Host ""
Write-Host "✅ Environment variables updated!" -ForegroundColor Green
Write-Host "🌐 New Production URL: $CURRENT_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚨 IMPORTANT: You still need to update Firebase Console!" -ForegroundColor Red
Write-Host "📋 Follow the steps in FIREBASE_VERCEL_FIX.md" -ForegroundColor Yellow