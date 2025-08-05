// Temporary simple schemas until validation is implemented
export const createEncounterSchema = {
  safeParse: (data: any) => ({
    success: true,
    data: data,
  }),
};

export const encounterQuerySchema = {
  safeParse: (data: any) => ({
    success: true,
    data: {
      page: 1,
      limit: 10,
      ...data,
    },
  }),
};
