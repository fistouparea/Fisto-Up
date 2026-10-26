import type { DeviceDataSource } from '../privacy/privacy.service.js';
import { ListingPhotoModel } from '../listings/listing.model.js';
import { ServiceBookingModel, ServiceDayLockModel, ServiceListingModel } from './service.model.js';

/**
 * "मेरा डेटा" for the Services engine (machines, work, animals): account-linked. Export lists what the person
 * posted and asked for. Erase removes their listings (with calendar locks and photos) and the notes of their
 * bookings; the bookings themselves stay, as a record for the other side, without the note.
 */
export const serviceDeviceData: DeviceDataSource = {
  name: 'services',
  export: async ({ userId }) => {
    if (!userId) return null;
    const [listings, bookings] = await Promise.all([
      ServiceListingModel.find({ ownerId: userId }, { photoIds: 0, location: 0 }).lean().exec(),
      ServiceBookingModel.find({ $or: [{ ownerId: userId }, { requesterId: userId }] }, { history: 0 }).lean().exec(),
    ]);
    return { listings, bookings };
  },
  erase: async ({ userId }) => {
    if (!userId) return 0;
    const listings = await ServiceListingModel.find({ ownerId: userId }, { _id: 1 }).lean().exec();
    const ids = listings.map((listing) => listing._id);
    const [, , removed, notes] = await Promise.all([
      ServiceDayLockModel.deleteMany({ listingId: { $in: ids } }).exec(),
      ListingPhotoModel.deleteMany({ listingId: { $in: ids } }).exec(),
      ServiceListingModel.deleteMany({ ownerId: userId }).exec(),
      ServiceBookingModel.updateMany({ $or: [{ ownerId: userId }, { requesterId: userId }] }, { $unset: { note: 1 } }).exec(),
    ]);
    return removed.deletedCount + notes.modifiedCount;
  },
};
