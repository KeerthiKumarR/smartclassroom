export interface FaceResult {
  bbox: number[];
  confidence: number;
  name: string;
  engagement: {
    score: number;
    state: string;
  };
}
