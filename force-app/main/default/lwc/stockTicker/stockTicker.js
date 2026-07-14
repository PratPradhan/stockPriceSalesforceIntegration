import { LightningElement } from 'lwc';
import getStocksnapshot from '@salesforce/apex/StockPriceController.getStocksnapshot';

export default class StockTicker extends LightningElement {
    currentPrice =null;
    isLoading =true;
    errorMessage ='';
    pollingInterval=null;

    async fetchPrice() {
        try{
            const result = await getStocksnapshot({symbols: ['AAPL']});

            if(result && result.length >0){
                this.currentPrice = result[0];
                this.errorMessage ='';
            }else{
                this.errorMessage ='No price data found';
            }

        } catch(error){
            this.errorMessage ='Failed to Load price data';
            console.error('Fetch error:', error);
        }
        finally{
            this.isLoading =false;
        }
    }
    connectedCallback(){
        this.fetchPrice();
        this.pollingInterval = setInterval(() =>{
            this.fetchPrice();
        }, 3000);
    }

    

    disconnectedCallback(){
        clearInterval(this.pollingInterval);
    }
}