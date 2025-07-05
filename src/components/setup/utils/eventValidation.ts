interface ValidationParams {
  sf1Qualifiers: number;
  sf2Qualifiers: number;
  sf1CountriesCount: number;
  sf2CountriesCount: number;
  autoQualifiersCount: number;
  grandFinalQualifiersCount: number;
}

export const validateEventSetup = (
  isGrandFinalOnly: boolean,
  params: ValidationParams,
) => {
  const {
    sf1Qualifiers,
    sf2Qualifiers,
    sf1CountriesCount,
    sf2CountriesCount,
    autoQualifiersCount,
    grandFinalQualifiersCount,
  } = params;

  if (!isGrandFinalOnly) {
    const sf2QualifiersCount = sf2CountriesCount > 0 ? sf2Qualifiers : 0;
    const totalQualifiers =
      sf1Qualifiers + sf2QualifiersCount + autoQualifiersCount;

    if (sf1Qualifiers <= 0 || (sf2Qualifiers <= 0 && sf2CountriesCount > 0)) {
      return 'The number of the Semi-Final qualifiers must be at least 1.';
    }

    if (totalQualifiers < 11) {
      return 'The total number of qualifiers for the Grand Final must be at least 11.';
    }

    if (sf1CountriesCount === 0) {
      return 'There are no countries in the Semi-Final 1.';
    }

    if (
      sf1Qualifiers >= sf1CountriesCount ||
      (sf2Qualifiers >= sf2CountriesCount && sf2CountriesCount > 0)
    ) {
      return 'The number of the Semi-Final qualifiers must be less than the number of participants.';
    }
  } else if (grandFinalQualifiersCount < 11) {
    return 'The number of the Grand Final participants must be at least 11.';
  }

  return null;
};
