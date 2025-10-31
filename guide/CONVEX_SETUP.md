# Convex Setup Instructions

## Initial Setup

1. **Install Convex CLI** (if not already installed):
   ```bash
   npm install -g convex
   ```

2. **Initialize Convex project**:
   ```bash
   npx convex dev
   ```
   
   This will:
   - Create a Convex account (if you don't have one)
   - Create a new project or connect to existing one
   - Generate the `_generated` files
   - Set up the `.env.local` file with `NEXT_PUBLIC_CONVEX_URL`

3. **Start the development server**:
   ```bash
   npm run dev
   ```

   In another terminal, run:
   ```bash
   npx convex dev
   ```

   This will watch for changes and sync your Convex functions.

## Seed Default Templates

After setting up Convex, you can seed the default templates by running:

```bash
npx convex run seed:seedDefaultTemplates
```

## Environment Variables

### Next.js Environment Variables (`.env.local`)

Make sure `.env.local` contains:
```
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

This will be automatically generated when you run `npx convex dev`.

### Convex Environment Variables (for backend actions)

For Convex backend code (actions, mutations, queries), environment variables need to be set using Convex's CLI or dashboard:

**Using Convex CLI:**
```bash
npx convex env set FAL_API_KEY your_fal_api_key_here
```

**Using Convex Dashboard:**
1. Go to your Convex dashboard
2. Navigate to Settings → Environment Variables
3. Add `FAL_API_KEY` with your fal.ai API key

**Required for Generator Module:**
- `FAL_API_KEY` - Your fal.ai API key for AI image/video generation

Note: These environment variables are only accessible in Convex backend code (actions), not in Next.js client/server code.

## Project Structure

- `convex/schema.ts` - Database schema definition
- `convex/queries.ts` - Read operations (queries)
- `convex/mutations.ts` - Write operations (mutations)
- `convex/seed.ts` - Seed data for templates
- `lib/convex-provider.tsx` - React provider for Convex client

## Next Steps

1. Run `npx convex dev` to initialize and get your deployment URL
2. Update `.env.local` with the generated `NEXT_PUBLIC_CONVEX_URL`
3. Start building admin interfaces at `/signage/admin`
4. Start building display pages at `/signage/display/[screenId]`

