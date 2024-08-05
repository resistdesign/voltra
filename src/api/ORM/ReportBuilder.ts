// TODO: Implement.

// TODO: Approach:
//  - Use the `TypeInfoORMService` to build a report.
//  - Apply a queueing strategy to handle the report building.
//    - Use queuing data types to organize queueing tasks.
//    - Take queueing task related functions as input.
//    - Track queueing carefully and consider things like:
//      - Race conditions with multiple queue processors.
//      - Not losing queued tasks.
//      - Handling queueing errors.
//      - Handling queueing timeouts and how much to process in a single batch.
import { TypeInfoMap } from "../../common/TypeParsing/TypeInfo";
import { ListItemsConfig } from "./ServiceTypes";
import { ReportCriteria } from "../../common/SearchTypes";

/**
 * The configuration for an item report.
 * */
export type ReportConfig = ListItemsConfig & {
  criteria?: ReportCriteria;
};

/**
 * The data required to queue report work.
 * */
export type QueuedReportWork = ReportConfig & {
  typeInfoName: string;
  typeInfoMap: TypeInfoMap;
};
