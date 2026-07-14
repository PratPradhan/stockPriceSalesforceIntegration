trigger stockRelayEventTrigger on Stock_Price_Event__e (after insert) {
    List<Stock_Price_Snapshot__c> stockPriceEventList = new List<Stock_Price_Snapshot__c>();
    for (Stock_Price_Event__e event: Trigger.New){
        Stock_Price_Snapshot__c stockPriceObj = new Stock_Price_Snapshot__c();
        stockPriceObj.Price__c = event.Price__c;
        stockPriceObj.Volume__c = event.Volume__c;
        stockPriceObj.Symbol__c =event.Symbol__c;
        stockPriceObj.Last_updated__c = System.now();
        stockPriceEventList.add(stockPriceObj);
        system.debug('Inside event trigger**'+event.Symbol__c+ 'Price : '+event.Price__c);
    }
    if(stockPriceEventList.size()>0){
        upsert stockPriceEventList Symbol__c;
    }

}