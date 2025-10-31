# Cursor Rules Structure

This document explains the organization and usage of Cursor rules in this project.

## Rule File Organization

All rules are stored in `.cursor/rules/` directory as `.mdc` files (Markdown with frontmatter).

### Rule File Format

Each rule file follows this structure:

```markdown
---
description: Brief description of what this rule covers
globs:          # Optional: file patterns this rule applies to
  - "**/*.tsx"
  - "**/*.ts"
alwaysApply:   # Optional: true/false (default: false)
---

# Rule Title

## Content sections...

```

## Rule Categories

### Always Applied Rules (Critical)

These rules apply to all code regardless of file type:

1. **`code-quality.mdc`** ✅
   - ESLint compliance
   - Code formatting standards
   - Error handling patterns
   - Documentation requirements
   - Always applied

2. **`core-typescript.mdc`** ✅
   - TypeScript strict mode
   - Type safety guidelines
   - Type definitions
   - Always applied

3. **`project-structure.mdc`** ✅
   - File organization
   - Import ordering
   - Naming conventions
   - Always applied

4. **`security.mdc`** ✅
   - Environment variable handling
   - API key management
   - Input validation
   - Security best practices
   - Always applied

5. **`prd-task-management.mdc`** ✅
   - PRD task list checking workflow
   - Task completion tracking
   - Checkbox updates
   - Project progress documentation
   - Always applied

### Context-Specific Rules (Applied by File Pattern)

These rules apply automatically based on file location/type:

6. **`convex-patterns.mdc`** ✅
   - Applies to: `convex/**/*.ts`
   - Query/mutation/action patterns
   - Schema validation
   - Database operations

7. **`nextjs-app-router.mdc`** ✅
   - Applies to: `app/**/*.tsx`
   - App Router conventions
   - Server vs client components
   - Route patterns

8. **`react-patterns.mdc`** ✅
   - Applies to: `app/**/*.tsx`, `components/**/*.tsx`
   - React hooks usage
   - Component patterns
   - State management

9. **`styling-tailwind.mdc`** ✅
   - Applies to: `**/*.tsx`, `**/*.css`
   - Tailwind utility classes
   - Dark mode support
   - Responsive design

10. **`ui-components.mdc`** ✅
    - Applies to: `components/ui/**/*.tsx`
    - shadcn/ui patterns
    - CVA variants
    - Accessibility

11. **`api-integration.mdc`** ✅
    - Applies to: `convex/**/*actions.ts`, `convex/**/*.ts`
    - External API patterns
    - Error handling
    - Async operations

12. **`form-handling.mdc`** ✅
    - Applies to: `app/**/*.tsx`, `components/**/*.tsx`
    - react-hook-form patterns
    - Validation
    - Form state

13. **`performance.mdc`** ✅
    - Applies to: `app/**/*.tsx`, `components/**/*.tsx`
    - React optimization
    - Bundle size
    - Loading strategies

14. **`loading-states.mdc`** ✅
    - Applies to: `app/**/*.tsx`, `components/**/*.tsx`
    - Loading indicators
    - Error states
    - User feedback

## Rule Usage Recommendations

### For New Files

When creating new files, Cursor will automatically apply relevant rules based on:
- File location (globs patterns)
- File extension
- Always-applied rules

### For Specific Tasks

- **Writing Convex functions**: Rules 1, 2, 3, 4, 5, 6 apply
- **Creating React components**: Rules 1, 2, 3, 4, 5, 8, 9, 10, 13, 14 apply
- **Building forms**: Rules 1, 2, 3, 4, 5, 8, 9, 12, 14 apply
- **Integrating APIs**: Rules 1, 2, 3, 4, 5, 6, 11 apply
- **Styling components**: Rules 1, 2, 3, 4, 5, 9, 10 apply
- **Working on PRD tasks**: Rule 5 applies (always check and update PRD)

### Rule Priority

1. Always-applied rules (code-quality, typescript, structure, security, PRD task management)
2. File-specific rules (based on globs)
3. Project conventions (implied by existing code)

**Important**: When working on tasks from the PRD (`guide/mdgenerator_prd.md`), always check the task list first and update checkboxes after completing work.

## Best Practices

1. **Keep rules focused**: Each rule file should cover one specific area
2. **Use globs appropriately**: Only apply rules where they're relevant
3. **Always apply critical rules**: Code quality, TypeScript, security
4. **Update rules as patterns evolve**: Keep rules in sync with codebase
5. **Document patterns**: Include examples in rule files

## Rule Maintenance

- Review rules quarterly or when patterns change significantly
- Add new rules for new patterns/technologies
- Remove obsolete rules
- Keep examples up-to-date with current codebase
- Test rules with actual code generation

## Current Rule Coverage

✅ **Covered:**
- Code quality and formatting
- TypeScript standards
- Project structure
- Security practices
- PRD task management workflow
- Convex patterns
- Next.js App Router
- React patterns
- Tailwind styling
- UI components
- API integration
- Form handling
- Performance optimization
- Loading states

📋 **Potential Future Rules:**
- Testing patterns (when tests are added)
- Accessibility guidelines (expand from ui-components)
- Documentation standards (expand from code-quality)
- Deployment patterns (if needed)

## How Rules Work

1. Cursor reads rule files from `.cursor/rules/`
2. Rules with `alwaysApply: true` are always active
3. Rules with `globs` are active when editing matching files
4. Rules are combined and applied during code generation
5. You can reference specific rules using `@rules` syntax

## Example Usage

```typescript
// When editing convex/actions.ts:
// - code-quality.mdc (always)
// - core-typescript.mdc (always)
// - project-structure.mdc (always)
// - security.mdc (always)
// - prd-task-management.mdc (always) ← Check PRD before starting
// - convex-patterns.mdc (globs match)
// - api-integration.mdc (globs match)

// When editing app/page.tsx:
// - code-quality.mdc (always)
// - core-typescript.mdc (always)
// - project-structure.mdc (always)
// - security.mdc (always)
// - prd-task-management.mdc (always) ← Check PRD before starting
// - nextjs-app-router.mdc (globs match)
// - react-patterns.mdc (globs match)
// - styling-tailwind.mdc (globs match)
// - performance.mdc (globs match)
// - loading-states.mdc (globs match)
```

## PRD Task Management Workflow

When working on tasks from the PRD:

1. **Before starting**: Read `guide/mdgenerator_prd.md` to check current task status
2. **During work**: Follow PRD specifications
3. **After completing**: Update checkboxes (`- [ ]` → `- [x]`) in the PRD

The `prd-task-management.mdc` rule ensures this workflow is always followed.

