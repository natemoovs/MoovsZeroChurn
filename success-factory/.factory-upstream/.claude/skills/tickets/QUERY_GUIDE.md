# Notion Tickets Query Guide

This guide provides the exact query patterns for filtering the Moovs Tickets database.

## Database Reference

**Database ID:** `13b8aeaa-3759-80f8-8d7c-dd2f627d2578`

**Tool:** `mcp__notion__API-query-data-source`

---

## Basic Query Structure

```json
{
  "data_source_id": "13b8aeaa-3759-80f8-8d7c-dd2f627d2578",
  "filter": { ... },
  "sorts": [ ... ],
  "page_size": 100
}
```

---

## Filter by Status

Status is a `status` property type.

### Single Status

```json
{
  "filter": {
    "property": "Status",
    "status": {
      "equals": "In progress"
    }
  }
}
```

### Exclude Status

```json
{
  "filter": {
    "property": "Status",
    "status": {
      "does_not_equal": "Done"
    }
  }
}
```

### Status Values

- `Not doing anymore`
- `Accepted`
- `Ingestion`
- `In progress`
- `Archived`
- `Done`

---

## Filter by Stage

Stage is a `multi_select` property type.

### Contains Stage

```json
{
  "filter": {
    "property": "Stage",
    "multi_select": {
      "contains": "In Development"
    }
  }
}
```

### Does Not Contain Stage

```json
{
  "filter": {
    "property": "Stage",
    "multi_select": {
      "does_not_contain": "Done"
    }
  }
}
```

### Stage Values

- `Not started`
- `Backlog`
- `Problem Validation`
- `Product Design / Work`
- `UI Design`
- `Ready for dev`
- `Eng Design`
- `In Development`
- `QA`
- `Code Review`
- `Deployed / Done`
- `Blocked`

---

## Filter by Priority

Priority is a `select` property type.

### Equals Priority

```json
{
  "filter": {
    "property": "Priority",
    "select": {
      "equals": "High"
    }
  }
}
```

### Priority Values

- `Low`
- `Medium`
- `High`

---

## Filter by Type

Type is a `multi_select` property type.

### Contains Type

```json
{
  "filter": {
    "property": "Type",
    "multi_select": {
      "contains": "Bug"
    }
  }
}
```

### Type Values

- `Bug`
- `Feature`
- `Request`
- `Insight`
- `Issue`

---

## Filter by Tags

Tags is a `multi_select` property type.

### Contains Tag

```json
{
  "filter": {
    "property": "Tags",
    "multi_select": {
      "contains": "Enterprise"
    }
  }
}
```

### Common Tags

- `Enterprise`
- `Shuttle`
- Customer names (DPV, Roberts Hawaii, Carey, Cornell, etc.)

---

## Filter by Due Date

Due Date is a `date` property type.

### Has Due Date

```json
{
  "filter": {
    "property": "Due Date",
    "date": {
      "is_not_empty": true
    }
  }
}
```

### Overdue (Before Today)

```json
{
  "filter": {
    "property": "Due Date",
    "date": {
      "before": "2025-01-16"
    }
  }
}
```

### Due This Week

```json
{
  "filter": {
    "property": "Due Date",
    "date": {
      "this_week": {}
    }
  }
}
```

### Due in Next 7 Days

```json
{
  "filter": {
    "property": "Due Date",
    "date": {
      "next_week": {}
    }
  }
}
```

### Due Date Range

```json
{
  "filter": {
    "and": [
      {
        "property": "Due Date",
        "date": {
          "on_or_after": "2025-01-01"
        }
      },
      {
        "property": "Due Date",
        "date": {
          "on_or_before": "2025-01-31"
        }
      }
    ]
  }
}
```

---

## Filter by Assignee

Assigned To is a `people` property type.

### Is Not Empty (Assigned)

```json
{
  "filter": {
    "property": "Assigned To",
    "people": {
      "is_not_empty": true
    }
  }
}
```

### Is Empty (Unassigned)

```json
{
  "filter": {
    "property": "Assigned To",
    "people": {
      "is_empty": true
    }
  }
}
```

### Contains Specific Person

```json
{
  "filter": {
    "property": "Assigned To",
    "people": {
      "contains": "{person_id}"
    }
  }
}
```

Note: You'll need the Notion user ID. Use `mcp__notion__API-get-users` to list users and get IDs.

---

## Filter by Score

Priority Score, Customer Impact Score, and Level of Effort Score are `number` properties.

### Score Greater Than

```json
{
  "filter": {
    "property": "Priority Score",
    "number": {
      "greater_than": 7
    }
  }
}
```

### Score Range

```json
{
  "filter": {
    "and": [
      {
        "property": "Customer Impact Score",
        "number": {
          "greater_than_or_equal_to": 5
        }
      },
      {
        "property": "Customer Impact Score",
        "number": {
          "less_than_or_equal_to": 8
        }
      }
    ]
  }
}
```

---

## Search by Name/Title

Name is a `title` property type.

### Contains Text

```json
{
  "filter": {
    "property": "Name",
    "title": {
      "contains": "login"
    }
  }
}
```

### Starts With

```json
{
  "filter": {
    "property": "Name",
    "title": {
      "starts_with": "Fix"
    }
  }
}
```

---

## Combined Filters (AND)

Use `and` to combine multiple conditions (all must match).

### High Priority Bugs in Development

```json
{
  "filter": {
    "and": [
      {
        "property": "Type",
        "multi_select": {
          "contains": "Bug"
        }
      },
      {
        "property": "Priority",
        "select": {
          "equals": "High"
        }
      },
      {
        "property": "Stage",
        "multi_select": {
          "contains": "In Development"
        }
      }
    ]
  }
}
```

### Unassigned High Priority Items

```json
{
  "filter": {
    "and": [
      {
        "property": "Priority",
        "select": {
          "equals": "High"
        }
      },
      {
        "property": "Assigned To",
        "people": {
          "is_empty": true
        }
      },
      {
        "property": "Status",
        "status": {
          "does_not_equal": "Done"
        }
      }
    ]
  }
}
```

---

## Combined Filters (OR)

Use `or` to combine conditions (any can match).

### Blocked OR Overdue

```json
{
  "filter": {
    "or": [
      {
        "property": "Stage",
        "multi_select": {
          "contains": "Blocked"
        }
      },
      {
        "property": "Due Date",
        "date": {
          "before": "2025-01-16"
        }
      }
    ]
  }
}
```

### Multiple Stages

```json
{
  "filter": {
    "or": [
      {
        "property": "Stage",
        "multi_select": {
          "contains": "In Development"
        }
      },
      {
        "property": "Stage",
        "multi_select": {
          "contains": "QA"
        }
      },
      {
        "property": "Stage",
        "multi_select": {
          "contains": "Code Review"
        }
      }
    ]
  }
}
```

---

## Sorting

### Sort by Priority Score (Descending)

```json
{
  "sorts": [
    {
      "property": "Priority Score",
      "direction": "descending"
    }
  ]
}
```

### Sort by Due Date (Ascending)

```json
{
  "sorts": [
    {
      "property": "Due Date",
      "direction": "ascending"
    }
  ]
}
```

### Multi-Sort (Priority then Due Date)

```json
{
  "sorts": [
    {
      "property": "Priority",
      "direction": "descending"
    },
    {
      "property": "Due Date",
      "direction": "ascending"
    }
  ]
}
```

---

## Common Query Recipes

### All Active Tickets (Not Done/Archived)

```json
{
  "data_source_id": "13b8aeaa-3759-80f8-8d7c-dd2f627d2578",
  "filter": {
    "and": [
      {
        "property": "Status",
        "status": {
          "does_not_equal": "Done"
        }
      },
      {
        "property": "Status",
        "status": {
          "does_not_equal": "Archived"
        }
      },
      {
        "property": "Status",
        "status": {
          "does_not_equal": "Not doing anymore"
        }
      }
    ]
  },
  "sorts": [
    {
      "property": "Priority Score",
      "direction": "descending"
    }
  ],
  "page_size": 100
}
```

### Ready to Bet (Shaped and Ready)

```json
{
  "data_source_id": "13b8aeaa-3759-80f8-8d7c-dd2f627d2578",
  "filter": {
    "and": [
      {
        "property": "Stage",
        "multi_select": {
          "contains": "Ready for dev"
        }
      },
      {
        "property": "Status",
        "status": {
          "does_not_equal": "Done"
        }
      }
    ]
  },
  "sorts": [
    {
      "property": "Priority Score",
      "direction": "descending"
    }
  ]
}
```

### Enterprise Commitments at Risk

```json
{
  "data_source_id": "13b8aeaa-3759-80f8-8d7c-dd2f627d2578",
  "filter": {
    "and": [
      {
        "property": "Tags",
        "multi_select": {
          "contains": "Enterprise"
        }
      },
      {
        "property": "Due Date",
        "date": {
          "before": "2025-01-31"
        }
      },
      {
        "property": "Status",
        "status": {
          "does_not_equal": "Done"
        }
      }
    ]
  },
  "sorts": [
    {
      "property": "Due Date",
      "direction": "ascending"
    }
  ]
}
```

### Blocked Items

```json
{
  "data_source_id": "13b8aeaa-3759-80f8-8d7c-dd2f627d2578",
  "filter": {
    "property": "Stage",
    "multi_select": {
      "contains": "Blocked"
    }
  },
  "sorts": [
    {
      "property": "Priority Score",
      "direction": "descending"
    }
  ]
}
```

### Customer-Specific Tickets

```json
{
  "data_source_id": "13b8aeaa-3759-80f8-8d7c-dd2f627d2578",
  "filter": {
    "or": [
      {
        "property": "Tags",
        "multi_select": {
          "contains": "DPV"
        }
      },
      {
        "property": "Name",
        "title": {
          "contains": "DPV"
        }
      }
    ]
  }
}
```

### Recent High-Impact Items

```json
{
  "data_source_id": "13b8aeaa-3759-80f8-8d7c-dd2f627d2578",
  "filter": {
    "and": [
      {
        "property": "Customer Impact Score",
        "number": {
          "greater_than_or_equal_to": 7
        }
      },
      {
        "property": "Status",
        "status": {
          "does_not_equal": "Done"
        }
      }
    ]
  },
  "sorts": [
    {
      "property": "Customer Impact Score",
      "direction": "descending"
    }
  ]
}
```

---

## Pagination

For large result sets, use pagination:

```json
{
  "data_source_id": "13b8aeaa-3759-80f8-8d7c-dd2f627d2578",
  "page_size": 100,
  "start_cursor": "{cursor_from_previous_response}"
}
```

The response includes `next_cursor` if more results exist.

---

## Properties to Request

When querying, these are the most useful properties to retrieve:

**Essential:**

- Name (title)
- ID (unique_id)
- Status
- Stage
- Priority
- Assigned To
- Due Date

**For Analysis:**

- Priority Score
- Customer Impact Score
- Level of Effort Score
- Type
- Tags
- Team

**For Details:**

- Summary
- Description
