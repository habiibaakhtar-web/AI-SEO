import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('real account and database-backed website/content workflow',async({page},testInfo)=>{
  test.setTimeout(90000);
  const email='browser-'+testInfo.project.name+'-'+Date.now()+'@example.com';
  await page.goto('/register');
  await page.getByLabel('Your name').fill('Browser Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password',{exact:true}).fill('BrowserPassword123');
  await page.getByRole('button',{name:'Create account'}).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole('link',{name:'Add website',exact:true}).click();
  await page.getByLabel('Website name').fill('My business');
  await page.getByLabel('Website URL').fill('https://example.com/');
  await page.getByLabel('Description (optional)').fill('A saved website for testing');
  await page.getByRole('button',{name:'Save website'}).click();
  await expect(page.getByRole('heading',{name:'My business',level:1})).toBeVisible();
  if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'Open workspace navigation'}).click();
  await page.getByRole('link',{name:'Keywords',exact:true}).click();
  await page.getByLabel('Keyword',{exact:true}).fill('small business SEO');
  await page.getByLabel('Category (optional)').fill('Services');
  await page.getByLabel('Notes (optional)').fill('Review for the homepage');
  await page.getByRole('button',{name:'Save keyword',exact:true}).click();
  await expect(page.getByText('small business SEO',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Edit small business SEO',exact:true}).click();
  await page.getByLabel('Priority',{exact:true}).selectOption('high');
  await page.getByRole('button',{name:'Update keyword'}).click();
  await expect(page.getByText('informational · high · planned',{exact:true})).toBeVisible();
  await page.getByLabel('Business topic').fill('local SEO');
  await page.getByRole('button',{name:'Generate keyword ideas'}).click();
  await expect(page.getByText('Rule-based suggestions',{exact:false})).toBeVisible();
  if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'Open workspace navigation'}).click();
  await page.getByRole('link',{name:'Websites',exact:true}).click();
  await page.getByRole('link',{name:/My business/}).click();
  await page.getByRole('button',{name:'Run SEO audit',exact:true}).first().click();
  await expect(page).toHaveURL(/audits\//);
  await expect(page.getByText('Your action plan',{exact:true})).toBeVisible({timeout:60000});
  await expect(page.getByText('Rule-based guidance',{exact:false}).first()).toBeAttached();
  const statuses=page.getByLabel('Task status',{exact:true});
  if(await statuses.count()){
    await statuses.first().selectOption('resolved');
    await expect(statuses.first()).toHaveValue('resolved');
    await page.reload();
    await expect(statuses.first()).toHaveValue('resolved');
  }
  await page.screenshot({path:`docs/screenshots/audit-${testInfo.project.name}.png`,fullPage:true});
  const auditScan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(auditScan.violations).toEqual([]);
  await page.getByRole('link',{name:'Back to website'}).click();
  await page.screenshot({path:`docs/screenshots/website-${testInfo.project.name}.png`,fullPage:true});
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'Open workspace navigation'}).click();
  await page.getByRole('link',{name:'Content Studio',exact:true}).click();
  await page.getByLabel('Page topic').fill('Small business SEO');
  await page.getByRole('button',{name:'Create draft'}).click();
  await expect(page.getByText('Rule-based draft',{exact:true})).toBeVisible();
  await expect(page.getByText('A beginner’s guide to Small business SEO',{exact:false}).first()).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:/Small business SEO/}).click();
  await expect(page.getByText('Rule-based draft',{exact:true})).toBeVisible();
  if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'Open workspace navigation'}).click();
  await page.getByRole('link',{name:'Settings',exact:true}).click();
  await page.getByLabel('Your name').fill('Updated Tester');
  await page.getByRole('button',{name:'Save profile'}).click();
  await expect(page.getByRole('status')).toContainText('Profile updated');
  await expect(page.getByRole('heading',{name:'AI connection'})).toBeVisible();
  await page.getByRole('button',{name:'Test AI connection'}).click();
  await expect(page.getByRole('alert').last()).toBeVisible();
  if(testInfo.project.name==='mobile')await page.getByRole('button',{name:'Open workspace navigation'}).click();
  await page.getByRole('button',{name:'Log out'}).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password',{exact:true}).fill('BrowserPassword123');
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL(/dashboard/);
});

test('registration layout and accessibility at narrow widths',async({page})=>{
  await page.goto('/register');
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
  for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth)).toBe(false);
  }
});

