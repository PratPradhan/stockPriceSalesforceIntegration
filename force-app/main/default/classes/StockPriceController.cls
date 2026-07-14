public with sharing class StockPriceController {
   
    @AuraEnabled(cacheable=false)
    public static List<Stock_Price_Snapshot__c> getStocksnapshot(List<string> symbols){
        return [SELECT id, Volume__c, Price__c, Symbol__c, Last_updated__c 
                                                    FROM Stock_Price_Snapshot__c 
                                                    WHERE Symbol__c IN: symbols ];
                                                    
    }
}