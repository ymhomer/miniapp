export const templates = [
  {
    id: 'flow-basic',
    name: 'Basic Flowchart',
    type: 'Flowchart',
    description: 'General process flow with decision node.',
    code: `flowchart TD
    A([Start]) --> B{Need review?}
    B -- Yes --> C[Prepare details]
    B -- No --> D[Continue process]
    C --> E[Submit for approval]
    D --> F([Done])
    E --> F`
  },
  {
    id: 'flow-lane',
    name: 'Swimlane Process',
    type: 'Flowchart',
    description: 'Department / role based process layout.',
    code: `flowchart LR
    subgraph User
      A[Submit request]
      B[Receive result]
    end

    subgraph System
      C[Validate data]
      D[Generate report]
    end

    subgraph Admin
      E[Review exception]
    end

    A --> C
    C -->|Valid| D --> B
    C -->|Exception| E --> D`
  },
  {
    id: 'sequence-api',
    name: 'API Sequence',
    type: 'Sequence',
    description: 'Client, service and database interaction.',
    code: `sequenceDiagram
    autonumber
    actor User
    participant UI as Web UI
    participant API as Backend API
    participant DB as Database

    User->>UI: Click submit
    UI->>API: POST /request
    API->>DB: Insert record
    DB-->>API: Record ID
    API-->>UI: Success response
    UI-->>User: Show confirmation`
  },
  {
    id: 'class-service',
    name: 'Service Class Diagram',
    type: 'Class',
    description: 'Simple domain/service structure.',
    code: `classDiagram
    class RequestController {
      +createRequest(payload)
      +getRequest(id)
    }

    class RequestService {
      +validate(payload)
      +submit(payload)
    }

    class RequestRepository {
      +save(entity)
      +findById(id)
    }

    RequestController --> RequestService
    RequestService --> RequestRepository`
  },
  {
    id: 'er-basic',
    name: 'ER Relationship',
    type: 'ERD',
    description: 'Entity relationship model.',
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : included_in

    CUSTOMER {
      int customer_id PK
      string name
      string email
    }

    ORDER {
      int order_id PK
      int customer_id FK
      date created_at
    }

    PRODUCT {
      int product_id PK
      string sku
      string name
    }`
  },
  {
    id: 'state-ticket',
    name: 'Ticket State Machine',
    type: 'State',
    description: 'Status transition diagram.',
    code: `stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted: submit
    Submitted --> InReview: assign reviewer
    InReview --> Approved: approve
    InReview --> Rejected: reject
    Rejected --> Draft: revise
    Approved --> Closed
    Closed --> [*]`
  },
  {
    id: 'gantt-plan',
    name: 'Project Gantt',
    type: 'Gantt',
    description: 'Lightweight project schedule.',
    code: `gantt
    title Implementation Plan
    dateFormat  YYYY-MM-DD
    section Discovery
    Requirement review     :a1, 2026-06-12, 3d
    Process confirmation   :a2, after a1, 2d
    section Build
    Prototype              :b1, after a2, 5d
    UAT                    :b2, after b1, 4d
    section Release
    Fixes                  :c1, after b2, 3d
    Go live                :milestone, after c1, 1d`
  },
  {
    id: 'mindmap-product',
    name: 'Product Mindmap',
    type: 'Mindmap',
    description: 'Feature planning map.',
    code: `mindmap
  root((Mermaid Studio))
    Editor
      Live preview
      Auto save
      Templates
    Viewer
      Zoom
      Pan
      Export
    Inspector
      Theme
      Metrics
      Errors`
  },
  {
    id: 'timeline-release',
    name: 'Release Timeline',
    type: 'Timeline',
    description: 'Milestone style timeline.',
    code: `timeline
    title Release Roadmap
    section Phase 1
      Prototype : Editor and preview
      Review : UX and template validation
    section Phase 2
      Export : SVG and PNG output
      Storage : Snapshots and local save
    section Phase 3
      Polish : Keyboard shortcuts and layout refinement`
  }
];

export const snippets = {
  node: `\n    X[New Node] --> Y[Next Node]`,
  decision: `\n    Q{Decision?}\n    Q -- Yes --> A[Action A]\n    Q -- No --> B[Action B]`,
  subgraph: `\n    subgraph Group Name\n      A[Step 1] --> B[Step 2]\n    end`,
  note: `\n    Note over User,API: Add explanation here`,
  class: `\n    classDef highlight fill:#17324a,stroke:#56a7ff,color:#ffffff;\n    class A highlight;`,
  style: `\n    style A fill:#17324a,stroke:#56a7ff,stroke-width:2px,color:#fff`
};
