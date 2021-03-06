import { Metric } from './metric'
import { AttributeMap } from '../attributeMap'

interface CommonMetricData {
  attributes?: AttributeMap
  timestamp?: number
  'interval.ms'?: number
}

interface MetricBatchPayload {
  common?: CommonMetricData
  metrics: Metric[]
}

export const LIMIT = 2000

export class MetricBatch implements MetricBatchPayload {
  public common?: CommonMetricData

  public metrics: Metric[]

  public constructor(
    attributes?: AttributeMap,
    timestamp?: number,
    interval?: number,
    metrics?: Metric[]
  ) {
    const common: CommonMetricData = {}

    if (attributes) {
      common.attributes = attributes
    }

    if (interval != null) {
      common['interval.ms'] = interval
    }

    if (timestamp != null) {
      common.timestamp = timestamp
    }

    if (Object.keys(common).length) {
      this.common = common
    }

    this.metrics = metrics || []

    if (this.metrics.length > LIMIT) {
      const remnant = this.metrics.splice(LIMIT)
      for (const idAndRemnant of remnant.entries()) {
        this.addMetric(idAndRemnant[1])
      }
    }
  }

  public getBatchSize(): number {
    return this.metrics.length
  }

  public split(): MetricBatch[] {
    if (this.metrics.length === 0) {
      return []
    }

    if (this.metrics.length === 1) {
      const metrics = [this.metrics[0]]
      const batch = MetricBatch.createNew(this.common, metrics)

      return [batch]
    }

    const midpoint = Math.floor(this.metrics.length / 2)
    const leftMetrics = this.metrics.slice(0, midpoint)
    const rightMetrics = this.metrics.slice(midpoint)

    const leftBatch = MetricBatch.createNew(this.common, leftMetrics)
    const rightBatch = MetricBatch.createNew(this.common, rightMetrics)

    return [leftBatch, rightBatch]
  }

  private static createNew(common: CommonMetricData, metrics: Metric[]): MetricBatch {
    const batch = new MetricBatch(
      common && common.attributes,
      common && common.timestamp,
      common &&  common['interval.ms'],
      metrics
    )

    return batch
  }

  public computeInterval(endTime: number): this {
    this.common['interval.ms'] = endTime - this.common.timestamp
    return this
  }

  public addMetric(metric: Metric): MetricBatch {
    this.metrics.push(metric)
    const len = this.metrics.length
    if (len > LIMIT) {
      const indexToDrop = this.getRandomInt(0, len - 1)
      const droppedMetric = this.metrics[indexToDrop]
      this.metrics[indexToDrop] = this.metrics[len - 1]
      this.metrics[len - 1] = droppedMetric
      this.metrics.pop()
    }
    return this
  }

  // get a random number between min and max, inclusive
  protected getRandomInt(min: number, max: number): number {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(
      Math.random() * ((max + 1) - min)
    ) + min
  }
}

