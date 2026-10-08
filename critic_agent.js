const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runCriticSubagent() {
    console.log("🤖 LAUNCHING GAME DESIGN CRITIC SUBAGENT...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    const filePath = 'file://' + path.resolve(__dirname, 'backrooms.html');
    console.log(`🌐 Navigating to game: ${filePath}`);
    await page.goto(filePath);

    // Initial screenshot
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'critic_initial_screen.png' });
    console.log("📸 Captured critic_initial_screen.png");

    // Click start button
    await page.click('#start-btn');
    await page.waitForTimeout(1500);

    // Evaluate HUD elements & game canvas
    const criticText = await page.textContent('#critic-text');
    console.log(`💬 In-Game Critic Status: "${criticText}"`);

    // Take screenshot of Level 0 gameplay
    await page.screenshot({ path: 'critic_level0_gameplay.png' });
    console.log("📸 Captured critic_level0_gameplay.png");

    // Test cycling levels programmatically to inspect all level designs
    const reviews = [];
    for (let levelIndex = 0; levelIndex < 15; levelIndex++) {
        const evalResult = await page.evaluate((idx) => {
            loadLevel(idx);
            const def = LEVEL_DEFINITIONS[idx];
            return {
                num: def.num,
                name: def.name,
                wallColor: def.wallColor,
                lightIntensity: def.lightIntensity,
                fogDensity: def.fogDensity,
                enemyType: def.enemyType,
                enemySpeed: def.enemySpeed,
                canvasWidth: renderer.domElement.width,
                canvasHeight: renderer.domElement.height,
                wallCount: wallsMeshGroup.children.length,
                enemyCount: enemies.length
            };
        }, levelIndex);

        await page.waitForTimeout(200);
        const ssPath = `critic_level_${levelIndex}.png`;
        if (levelIndex === 0 || levelIndex === 2 || levelIndex === 6 || levelIndex === 11 || levelIndex === 14) {
            await page.screenshot({ path: ssPath });
            console.log(`📸 Captured screenshot for ${evalResult.num}: ${ssPath}`);
        }

        // Subagent evaluation checks
        const issues = [];
        if (evalResult.wallCount === 0) issues.push("Zero walls generated!");
        if (evalResult.enemyCount === 0) issues.push("No enemy spawned!");
        if (evalResult.lightIntensity <= 0) issues.push("Scene too dark without ambient light!");

        reviews.push({
            level: evalResult.num,
            name: evalResult.name,
            status: issues.length === 0 ? "PASS" : "FAIL",
            issues: issues
        });
    }

    console.log("\n=================== CRITIC SUBAGENT REPORT ===================");
    console.table(reviews);
    console.log("==============================================================");

    await browser.close();
}

runCriticSubagent().catch(err => {
    console.error("Critic subagent failed:", err);
    process.exit(1);
});
