/*
  Nothing is deleted. Uninstalling without purging leaves both tables in place, so reinstalling brings every
  sale and its usage count back; purging drops them, and that is kempo's decision to make. Orders keep their own
  discount rows either way.
*/
export default async () => {
  console.log('[kempo-discounts] Removing. Sales stop applying at once; past orders keep the discounts they were given.');
};
