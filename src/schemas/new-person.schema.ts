/**
 * Built-in schema for creating a new contact.
 *
 * Defines the fields shown in the "Orbit: New Person" modal.
 * Used by ContactManager.createContact() to populate frontmatter
 * and template placeholders.
 */
import type { SchemaDef } from './types';

export const newPersonSchema: SchemaDef = {
    id: 'new-person',
    title: 'New Person',
    fields: [
        {
            key: 'name',
            type: 'text',
            label: 'Name',
            placeholder: 'Full name',
            required: true,
        },
        {
            key: 'category',
            type: 'dropdown',
            label: 'Category',
            options: ['Family', 'Friends', 'Work', 'Community'],
            required: true,
        },
        {
            key: 'frequency',
            type: 'dropdown',
            label: 'Frequency',
            options: [
                'Daily',
                'Weekly',
                'Bi-Weekly',
                'Monthly',
                'Quarterly',
                'Bi-Annually',
                'Yearly',
            ],
            default: 'Monthly',
            required: true,
        },
        {
            key: 'social_battery',
            type: 'dropdown',
            label: 'Social Battery',
            options: ['Charger', 'Neutral', 'Drain'],
        },
        {
            key: 'birthday',
            type: 'date',
            label: 'Birthday',
            layout: 'half-width',
        },
        {
            key: 'photo',
            type: 'photo',
            label: 'Photo',
            placeholder: 'https://...',
            description: 'Paste a URL to the contact\'s photo',
        },
        {
            key: 'google_contact',
            type: 'text',
            label: 'Google Contact',
            placeholder: 'https://contacts.google.com/...',
        },
    ],
    submitLabel: 'Create Contact',
    output: {
        path: 'People/{{name}}.md',
    },
};
