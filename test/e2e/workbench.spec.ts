import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

test('loads the workbench and runs a mesh repair interaction', async ({ page }) => {
  await page.goto('/cadmesh-workbench/');

  await expect(page.getByText('cadmesh-workbench')).toBeVisible();
  await expect(page.getByText(/v0\.2\.0/)).toBeVisible();
  await expect(page.getByRole('link', { name: /open repository/i })).toHaveAttribute(
    'href',
    'https://github.com/baditaflorin/cadmesh-workbench',
  );
  await expect(page.getByRole('link', { name: /support/i })).toHaveAttribute(
    'href',
    'https://www.paypal.com/paypalme/florinbadita',
  );

  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(async () => canvas.boundingBox()).not.toBeNull();

  await page
    .getByLabel(/CAD, mesh, or photos/i)
    .setInputFiles('test/fixtures/realdata/03-3dbenchy-stl/input.stl');
  await expect(
    page.locator('.diagnostic-head strong').filter({ hasText: /STL-ASCII mesh with 4 triangles/i }),
  ).toBeVisible();
  await expect(page.locator('.state-pill').filter({ hasText: /loaded some/i })).toBeVisible();

  await page.getByRole('button', { name: 'Mesh', exact: true }).click();
  await page.getByRole('button', { name: /sample/i }).click();
  await expect(page.getByText(/raw triangles/i)).toBeVisible();
  await page.getByRole('button', { name: 'Repair', exact: true }).click();
  await expect(page.getByText(/repaired triangles/i)).toBeVisible();

  const screenshot = await canvas.screenshot();
  const png = PNG.sync.read(screenshot);
  let nonBackgroundPixels = 0;
  for (let y = 0; y < png.height; y += 8) {
    for (let x = 0; x < png.width; x += 8) {
      const idx = (png.width * y + x) * 4;
      const red = png.data[idx];
      const green = png.data[idx + 1];
      const blue = png.data[idx + 2];
      const differsFromBackground = Math.abs(red - 246) + Math.abs(green - 247) + Math.abs(blue - 249) > 40;
      if (differsFromBackground) nonBackgroundPixels += 1;
    }
  }
  expect(nonBackgroundPixels).toBeGreaterThan(40);
});
