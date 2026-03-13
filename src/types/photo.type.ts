
export type ReplaceAdvertisementPhotoParams = {
  agentId: number;
  advertisementId: number;
  photoId: number;
  file: Express.Multer.File;
  baseUrl: string;
};