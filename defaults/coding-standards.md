# Coding Standards

## Functions
- Functions should not exceed 20 lines (warning) or 50 lines (error)
- Functions should start with a verb (get, set, handle, process, etc.)
- Avoid deep nesting beyond 4 levels
- Functions should not have more than 5 parameters

## Naming
- Avoid generic names: data, result, temp, item, value, obj, ret, res, tmp, info, stuff
- Boolean variables should be named as questions: is*, has*, can*, should*, will*

## Files
- Files should not exceed 200 lines
- Each file should have at least one incoming dependency (no orphans)
- Avoid circular dependencies

## Error Handling
- Never use empty catch/except blocks (silent failures)

## Comments
- Remove commented-out code
- Comments should explain why, not what
