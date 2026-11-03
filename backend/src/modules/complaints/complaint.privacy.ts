import { ListingPhotoModel } from '../listings/listing.model.js';
import type { DeviceDataSource } from '../privacy/privacy.service.js';
import { ReportModel } from '../reports/report.model.js';

/**
 * "मेरा डेटा" for complaints: the person's own messages and complaint photos are removed. The complaint record
 * stays (without its text, see privacy.service) so the other side and the coordinators keep the case history.
 */
export const complaintDeviceData: DeviceDataSource = {
  name: 'complaints',
  export: async ({ userId }) => {
    if (!userId) return null;
    return ReportModel.find({ $or: [{ reporterId: userId }, { againstUserId: userId }] }, { reason: 1, text: 1, status: 1, messages: 1, resolution: 1, createdAt: 1 }).lean().exec();
  },
  erase: async ({ userId }) => {
    if (!userId) return 0;
    const own = await ReportModel.find({ reporterId: userId, photoId: { $exists: true } }, { photoId: 1 }).lean().exec();
    const [messages, photos] = await Promise.all([
      ReportModel.updateMany({ 'messages.fromUserId': userId }, { $pull: { messages: { fromUserId: userId } } }).exec(),
      ListingPhotoModel.deleteMany({ _id: { $in: own.map((row) => row.photoId) } }).exec(),
    ]);
    await ReportModel.updateMany({ reporterId: userId }, { $unset: { photoId: 1 } }).exec();
    return messages.modifiedCount + photos.deletedCount;
  },
};
