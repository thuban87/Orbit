# Custom schemas

Schemas let you create different contact templates with custom fields. The default "New Person" schema is built into the plugin — you can't edit it, but you can create your own schemas that appear alongside it.

## Setting up a schema folder

1. Go to **Settings → Orbit → Schema folder**
2. Enter a vault folder path (e.g., `System/Schemas`)
3. Click **Generate example** to create a starter schema you can customize

## How schemas work

A schema is a standard markdown file with special frontmatter. When you create a new contact, if you have custom schemas, Orbit shows a picker so you can choose which template to use.

## Two ways to define fields

Schemas support two methods for defining form fields. You can use either or both in the same schema.

### Method 1: Flat frontmatter properties

The simplest approach — just add keys to the frontmatter. Each key becomes a **text input** in the form.

```yaml
---
schema_id: work-contact
schema_title: Work Contact
output_path: "People/Work/{{name}}.md"
submit_label: Create Contact
name:
company:
role:
department:
email:
---
```

This creates a form with 5 text fields: Name, Company, Role, Department, and Email.

**How it works:**
- Keys are automatically converted to labels (`company` → "Company", `social_battery` → "Social battery")
- Empty values create blank text inputs
- Pre-filled values set defaults (`frequency: Monthly`)
- Reserved keys (`schema_id`, `schema_title`, `output_path`, `submit_label`, `cssClass`) are metadata, not fields

### Method 2: Fields code block

For more control, add a `` ```fields `` code block in the body. This lets you define dropdowns, dates, required fields, and more.

````markdown
```fields
- key: name
  type: text
  label: Name
  placeholder: Full name
  required: true
- key: category
  type: dropdown
  label: Category
  options: [Work, Client, Vendor]
  default: Work
  required: true
- key: frequency
  type: dropdown
  label: Check-in frequency
  options: [Weekly, Bi-Weekly, Monthly, Quarterly]
  default: Monthly
- key: birthday
  type: date
  label: Birthday
  layout: half-width
- key: photo
  type: photo
  label: Photo
  placeholder: URL, path, or wikilink
```
````

### Field properties

| Property | Required | Description |
|----------|----------|-------------|
| `key` | ✅ | Frontmatter property name |
| `type` | ✅ | `text`, `dropdown`, `textarea`, `date`, or `photo` |
| `label` | ✅ | Display label in the form |
| `placeholder` | | Hint text shown in empty fields |
| `required` | | `true` or `false` |
| `default` | | Pre-filled value |
| `options` | | Array for dropdown types: `[Option1, Option2, Option3]` |
| `layout` | | `half-width` for side-by-side layout |
| `description` | | Help text below the field |

### Combining both methods

If a key appears in both the frontmatter and the fields block, the **fields block takes precedence**. This lets you use flat keys for most fields and only write detailed definitions for the ones that need dropdowns or other types.

## Body template

Any markdown content after the fields block becomes the **body template** for new contacts created with this schema. Use `{{key}}` placeholders that get replaced with form values.

```markdown
# {{name}}

> Company: {{company}}
> Role: {{role}}

## Conversational Fuel
-

## Interaction Log
```

## Complete example

Here's a full custom schema for work contacts:

````markdown
---
schema_id: work-contact
schema_title: Work Contact
output_path: "People/Work/{{name}}.md"
submit_label: Create Work Contact
company:
---

```fields
- key: name
  type: text
  label: Name
  placeholder: Full name
  required: true
- key: company
  type: text
  label: Company
  placeholder: Company name
- key: frequency
  type: dropdown
  label: Check-in frequency
  options: [Weekly, Bi-Weekly, Monthly, Quarterly]
  default: Monthly
  required: true
- key: social_battery
  type: dropdown
  label: Social battery
  options: [Charger, Neutral, Drain]
```

# {{name}}

> Company: {{company}}

## Conversational Fuel
-

## Work Notes


## Interaction Log
````

## Reserved frontmatter keys

These keys are used for schema configuration and won't appear as form fields:

| Key | Purpose |
|-----|---------|
| `schema_id` | **Required.** Unique identifier for the schema |
| `schema_title` | **Required.** Display name shown in the picker |
| `output_path` | File path template with `{{key}}` placeholders |
| `submit_label` | Custom text for the submit button |
| `cssClass` | Optional CSS class for styling |

## Tips

- Files without `schema_id` in the frontmatter are ignored — they won't accidentally become schemas
- Schema IDs must be unique. If a user schema conflicts with a built-in schema, the built-in takes precedence
- The default "New Person" schema is hardcoded in the plugin. To customize the default contact workflow, create your own schema
