// backend/src/shared/types/index.js

// Equivalent of your WorkItemType enum
const WorkItemType = {
  ROOF:           'Roof',
  KITCHEN:        'Kitchen',
  BATH:           'Bath',
  FLOORING:       'Flooring',
  INTERIOR_PAINT: 'Interior Paint',
  EXTERIOR_PAINT: 'Exterior Paint',
  WINDOWS:        'Windows',
  HVAC:           'HVAC',
  ELECTRICAL:     'Electrical Re-wire',
  PLUMBING:       'Plumbing',
  LANDSCAPING:    'Landscaping',
};

// Runtime record of work-item costs
const WORK_ITEM_COSTS = {
  [WorkItemType.ROOF]:           { cost: 10,     unit: 'sf'    },
  [WorkItemType.KITCHEN]:        { cost: 25000,  unit: 'total' },
  [WorkItemType.BATH]:           { cost: 12000,  unit: 'each'  },
  [WorkItemType.FLOORING]:       { cost: 5,      unit: 'sf'    },
  [WorkItemType.INTERIOR_PAINT]: { cost: 2,      unit: 'sf'    },
  [WorkItemType.EXTERIOR_PAINT]: { cost: 3,      unit: 'sf'    },
  [WorkItemType.WINDOWS]:        { cost: 500,    unit: 'each'  },
  [WorkItemType.HVAC]:           { cost: 8000,   unit: 'total' },
  [WorkItemType.ELECTRICAL]:     { cost: 15000,  unit: 'total' },
  [WorkItemType.PLUMBING]:       { cost: 12000,  unit: 'total' },
  [WorkItemType.LANDSCAPING]:    { cost: 5000,   unit: 'total' },
};

module.exports = {
  WorkItemType,
  WORK_ITEM_COSTS,
};
