# Page Layout Template Guide

This guide explains how to create consistent page layouts across your CareLink application using the standardized CSS template.

## Quick Start

1. Import the template CSS in your component:
```css
@import url('../components/PageTemplate.css');
```

2. Use this basic HTML structure:
```jsx
return (
    <BaseLayout>
        <div className="page-container">
            <div className="content-container content-container-sm">
                <h1 className="page-title">Your Page Title</h1>
                {/* Your content here */}
            </div>
        </div>
    </BaseLayout>
);
```

## Container Sizes

Choose the appropriate container size for your content:

- `content-container-sm` (500px max-width) - Forms, login pages
- `content-container` (900px max-width) - Default size
- `content-container-md` (700px max-width) - Medium content
- `content-container-lg` (1200px max-width) - Large tables, dashboards

## Form Example

```jsx
<div className="page-container">
    <div className="content-container content-container-sm">
        <h1 className="page-title">Register</h1>
        <form>
            <div className="form-group-template">
                <label>Email</label>
                <input 
                    type="email" 
                    placeholder="Enter your email"
                />
            </div>
            <button className="btn-template btn-template-full">
                Submit
            </button>
        </form>
    </div>
</div>
```

## Styling Classes

### Layout Classes
- `page-container` - Main page wrapper (required)
- `content-container` - Content area with background and shadow
- `page-title` - Styled page headings

### Form Classes  
- `form-group-template` - Form field wrapper
- `btn-template` - Styled buttons
- `btn-template-full` - Full width buttons

### Message Classes
- `error-message-template` - Error messages
- `success-message-template` - Success messages

### Utility Classes
- `text-center`, `text-left`, `text-right` - Text alignment
- `mt-1` to `mt-4` - Margin top (8px to 32px)
- `mb-1` to `mb-4` - Margin bottom (8px to 32px)
- `p-1` to `p-4` - Padding (8px to 32px)

## Why Use This Template?

1. **Consistent Height/Width**: Solves your layout issues with standardized dimensions
2. **Professional Design**: Matches ProfilePage.css aesthetic
3. **Responsive**: Works on all screen sizes
4. **Reusable**: Same structure for all pages
5. **Maintainable**: Change once, update everywhere

## Migration Steps

For existing pages:
1. Add the template import
2. Replace outer div with `page-container`
3. Replace inner container with `content-container`
4. Update form classes to use `form-group-template`
5. Update buttons to use `btn-template`

This eliminates height/width issues and ensures visual consistency across your application.
