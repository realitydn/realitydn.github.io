/**
 * Notion API helper service
 */

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

export async function createNotionPage(env, databaseId, properties) {
  try {
    const response = await fetch(`${NOTION_API_BASE}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.NOTION_API_KEY}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId
        },
        properties
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Notion API error:', response.status, errorData);
      throw new Error(`Notion API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Notion page created:', data.id);
    return { success: true, pageId: data.id };
  } catch (error) {
    console.error('Error creating Notion page:', error);
    throw error;
  }
}

/**
 * Build Notion property object for Event Proposal
 */
export function buildEventProposalProperties(formData) {
  return {
    'Host Name': {
      title: [
        {
          text: {
            content: formData.hostName
          }
        }
      ]
    },
    'Email': {
      email: formData.email
    },
    'Contact Info': {
      rich_text: [
        {
          text: {
            content: formData.contact
          }
        }
      ]
    },
    'Event Description': {
      rich_text: [
        {
          text: {
            content: formData.eventDescription
          }
        }
      ]
    },
    'Recurrence': {
      select: mapRecurrence(formData.recurrence)
    },
    'Scheduling Preferences': {
      rich_text: [
        {
          text: {
            content: formData.schedule
          }
        }
      ]
    },
    'Duration': {
      rich_text: [
        {
          text: {
            content: formData.duration
          }
        }
      ]
    },
    'Cost': {
      rich_text: [
        {
          text: {
            content: formData.cost
          }
        }
      ]
    },
    'Language': {
      multi_select: formData.language.map(lang => ({
        name: lang
      }))
    },
    'Preferred Space': {
      multi_select: mapEventSpaces(formData.space)
    },
    'Equipment Needed': {
      rich_text: [
        {
          text: {
            content: Array.isArray(formData.equipment) ? formData.equipment.join(', ') : formData.equipment
          }
        }
      ]
    },
    'Additional Notes': {
      rich_text: [
        {
          text: {
            content: formData.anythingElse || ''
          }
        }
      ]
    },
    'Status': {
      select: {
        name: 'Submitted'
      }
    },
    'Submitted At': {
      date: {
        start: new Date().toISOString()
      }
    }
  };
}

/**
 * Build Notion property object for Art Exhibition
 */
export function buildArtExhibitionProperties(formData) {
  const artistName = formData.artistName || formData.name;

  return {
    'Artist / Collective Name': {
      title: [
        {
          text: {
            content: artistName
          }
        }
      ]
    },
    'Email': {
      email: formData.email
    },
    'Contact Name': {
      rich_text: [
        {
          text: {
            content: formData.name
          }
        }
      ]
    },
    'Location / Availability': {
      rich_text: [
        {
          text: {
            content: formData.location
          }
        }
      ]
    },
    'Contact Info': {
      rich_text: [
        {
          text: {
            content: formData.contact
          }
        }
      ]
    },
    'Artist Bio': {
      rich_text: [
        {
          text: {
            content: formData.bio
          }
        }
      ]
    },
    'Portfolio Link': {
      url: formData.portfolioLink
    },
    'Show Concept': {
      rich_text: [
        {
          text: {
            content: formData.showConcept
          }
        }
      ]
    },
    'Spaces Requested': {
      multi_select: (formData.spaces || []).map(space => ({
        name: space
      }))
    },
    'Space Scale': {
      rich_text: [
        {
          text: {
            content: formData.spaceScale
          }
        }
      ]
    },
    'Installation Needs': {
      rich_text: [
        {
          text: {
            content: formData.installationNeeds || ''
          }
        }
      ]
    },
    'Preferred Dates': {
      rich_text: [
        {
          text: {
            content: formData.preferredDates
          }
        }
      ]
    },
    'Timeline Flexibility': {
      select: {
        name: formData.flexibility === 'Very flexible' ? 'Flexible' : formData.flexibility
      }
    },
    'Group Show': {
      rich_text: [
        {
          text: {
            content: formData.groupShow === 'yes' ? `Yes (${formData.artistCount || '?'} artists)` : 'No'
          }
        }
      ]
    },
    'Curator / Point of Contact': {
      rich_text: [
        {
          text: {
            content: formData.curator || ''
          }
        }
      ]
    },
    'Status': {
      select: {
        name: 'Submitted'
      }
    },
    'Submitted At': {
      date: {
        start: new Date().toISOString()
      }
    }
  };
}

function mapRecurrence(recurrenceValue) {
  const mapping = {
    'Weekly': 'Recurring',
    'Biweekly': 'Recurring',
    'Monthly': 'Recurring',
    'One-time': 'One-time',
    "Let's discuss": null
  };

  const mapped = mapping[recurrenceValue];
  return mapped ? { name: mapped } : null;
}

function mapEventSpaces(spaces) {
  return spaces.map(space => {
    let mappedName = space;
    if (space === 'Ground floor lounge (1L)') {
      mappedName = 'Main Bar';
    }
    return { name: mappedName };
  });
}
