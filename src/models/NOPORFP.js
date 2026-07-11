import connectToDatabase from '@/lib/db';

class NO_PO_RFP {
    static async getRFPDetails(isAdmin = true, user = null, referenceNo = null) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);

            let query = `
                SELECT 
                    RH.REFERENCENO, 
                    RH.RFP_STATUS, 
                    RH.PAYEE, 
                    RH.EXPENSECAT, 
                    RH.COSTCENTER AS CCH, 
                    RH.LOCATION AS LH, 
                    RH.PAYMENTTERMS, 
                    RH.PAYEETIN, 
                    RH.CREATEDBY, 
                    RH.DATECREATED, 
                    RD.DESCRIPTION, 
                    RD.BUDGETCODE, 
                    RD.ACCT, 
                    RD.COSTCENTER AS CCD, 
                    RD.LOCATION AS LLH, 
                    RD.AMOUNT, 
                    RD.EWT, 
                    RH.MODIFIEDBY, 
                    RH.DATEMODIFIED, 
                    RD.CREATEDBY AS CBD, 
                    RD.DATECREATED AS DCD, 
                    RD.MODIFIEDBY AS MD, 
                    RD.DATEMODIFIED AS DMD
                FROM [RFP.REQUESTHEADER.1] AS RH INNER JOIN
                [RFP.REQUESTDETAILS.1] AS RD ON RH.REFERENCENO = RD.REFERENCENO
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Non-admin users only see requests they created
            if (!isAdmin && user) {
                const userName = user.empName;
                query += ` AND UPPER(RH.CREATEDBY) = UPPER(@userName${paramIndex})`;
                params.push({ name: `userName${paramIndex}`, value: userName });
                paramIndex++;
            }

            // Optional filter by specific reference number
            if (referenceNo) {
                query += ` AND RH.REFERENCENO = @referenceNo${paramIndex}`;
                params.push({ name: `referenceNo${paramIndex}`, value: referenceNo });
                paramIndex++;
            }

            query += ` ORDER BY RH.DATECREATED DESC`;

            const request = connection.request();
            params.forEach(param => request.input(param.name, param.value));

            const rfpDetailsResults = await request.query(query);
            const rfpDetails = rfpDetailsResults.recordset;
            return rfpDetails.map(rfp => ({
                referenceNo: rfp.REFERENCENO,
                rfpStatus: rfp.RFP_STATUS,
                payee: rfp.PAYEE,
                expenseCategory: rfp.EXPENSECAT,
                costCenter: rfp.CCH,
                location: rfp.LH,
                paymentTerms: rfp.PAYMENTTERMS,
                payeeTIN: rfp.PAYEETIN,
                createdBy: rfp.CREATEDBY,
                dateCreated: rfp.DATECREATED,
                description: rfp.DESCRIPTION,
                budgetCode: rfp.BUDGETCODE,
                acct: rfp.ACCT,
                costCenterDetail: rfp.CCD,
                locationDetail: rfp.LLH,
                amount: rfp.AMOUNT,
                ewt: rfp.EWT,
                createdByDetail: rfp.CREATEDBY,
                dateCreated: rfp.DATECREATED,
                modifiedBy: rfp.MODIFIEDBY,
                dateModified: rfp.DATEMODIFIED,
                detailCreatedBy: rfp.CBD,
                detailDateCreated: rfp.DCD,
                detailModifiedBy: rfp.MD,
                detailDateModified: rfp.DMD
            }));

        } catch (error) {
            console.error('Error fetching RFP details:', error);
            return { success: false, message: 'Failed to fetch RFP details' };
        }
    }

    static async saveRFPDetails(rfpData) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            const { referenceNo, rfpStatus, payee, expenseCategory, costCenter, location, paymentTerms, payeeTIN, createdBy, lines } = rfpData;

            const headerQuery = `
                INSERT INTO [RFP.REQUESTHEADER.1] (REFERENCENO, RFP_STATUS, PAYEE, EXPENSECAT, COSTCENTER, LOCATION, PAYMENTTERMS, PAYEETIN, CREATEDBY, DATECREATED)
                VALUES (@referenceNo, @rfpStatus, @payee, @expenseCategory, @costCenter, @location, @paymentTerms, @payeeTIN, @createdBy, GETDATE());
            `;
            await connection.request()
                .input('referenceNo', referenceNo)
                .input('rfpStatus', rfpStatus)
                .input('payee', payee)
                .input('expenseCategory', expenseCategory)
                .input('costCenter', costCenter)
                .input('location', location)
                .input('paymentTerms', paymentTerms)
                .input('payeeTIN', payeeTIN)
                .input('createdBy', createdBy)
                .query(headerQuery);

            const detailQuery = `
                INSERT INTO [RFP.REQUESTDETAILS.1] (REFERENCENO, DESCRIPTION, BUDGETCODE, ACCT, COSTCENTER, LOCATION, AMOUNT, EWT, CREATEDBY, DATECREATED)
                VALUES (@referenceNo, @description, @budgetCode, @acct, @costCenterDetail, @locationDetail, @amount, @ewt, @createdBy, GETDATE());
            `;
            for (const line of lines) {
                await connection.request()
                    .input('referenceNo', referenceNo)
                    .input('description', line.description)
                    .input('budgetCode', line.budgetCode)
                    .input('acct', line.acct)
                    .input('costCenterDetail', line.costCenter)
                    .input('locationDetail', line.location)
                    .input('amount', line.amount)
                    .input('ewt', line.ewt)
                    .input('createdBy', createdBy)
                    .query(detailQuery);
            }

            return { success: true, message: 'RFP details saved successfully' };
        } catch (error) {
            console.error('Error saving RFP details:', error);
            return { success: false, message: 'Failed to save RFP details' };
        }
    }

    static async getLatestReferenceNo() {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            const query = `
                SELECT TOP 1 REFERENCENO
                FROM [RFP.REQUESTHEADER.1]
                ORDER BY DATECREATED DESC
            `;
            const result = await connection.request().query(query);

            let nextNumber = 1;
            if (result.recordset.length > 0) {
                const latest = result.recordset[0].REFERENCENO;
                const match = latest && latest.match(/(\d+)$/);
                if (match) {
                    nextNumber = parseInt(match[1], 10) + 1;
                }
            }
            return `RFP-${String(nextNumber).padStart(8, '0')}`;
        } catch (error) {
            console.error('Error fetching latest reference number:', error);
            return null;
        }
    }

    static async updateRFP(referenceNo, updatedData) {
        let connection;
        try {
            connection = await connectToDatabase(process.env.DB_SFC);
            const { rfpStatus, payee, expenseCategory, costCenter, location, paymentTerms, payeeTIN, modifiedBy, createdBy, lines } = updatedData;

            // Only DRAFT requests are editable. Guard against updating anything else.
            const statusCheck = await connection.request()
                .input('referenceNo', referenceNo)
                .query(`SELECT RFP_STATUS FROM [RFP.REQUESTHEADER.1] WHERE REFERENCENO = @referenceNo`);

            if (statusCheck.recordset.length === 0) {
                return { success: false, message: 'RFP request not found' };
            }
            const currentStatus = (statusCheck.recordset[0].RFP_STATUS || '').toUpperCase();
            if (currentStatus !== 'DRAFT') {
                return { success: false, message: 'Only DRAFT requests can be edited' };
            }

            // Update header (status may transition DRAFT -> SUBMITTED, or remain DRAFT)
            const updateHeaderQuery = `
                UPDATE [RFP.REQUESTHEADER.1]
                SET RFP_STATUS = @rfpStatus,
                    PAYEE = @payee,
                    EXPENSECAT = @expenseCategory,
                    COSTCENTER = @costCenter,
                    LOCATION = @location,
                    PAYMENTTERMS = @paymentTerms,
                    PAYEETIN = @payeeTIN,
                    MODIFIEDBY = @modifiedBy,
                    DATEMODIFIED = GETDATE()
                WHERE REFERENCENO = @referenceNo `;

            await connection.request()
                .input('rfpStatus', rfpStatus)
                .input('payee', payee)
                .input('expenseCategory', expenseCategory)
                .input('costCenter', costCenter)
                .input('location', location)
                .input('paymentTerms', paymentTerms)
                .input('payeeTIN', payeeTIN)
                .input('modifiedBy', modifiedBy)
                .input('referenceNo', referenceNo)
                .query(updateHeaderQuery);

            // Replace the detail lines to support edited/added/removed rows.
            await connection.request()
                .input('referenceNo', referenceNo)
                .query(`DELETE FROM [RFP.REQUESTDETAILS.1] WHERE REFERENCENO = @referenceNo`);

            const detailQuery = `
                INSERT INTO [RFP.REQUESTDETAILS.1] (REFERENCENO, DESCRIPTION, BUDGETCODE, ACCT, COSTCENTER, LOCATION, AMOUNT, EWT, CREATEDBY, DATECREATED, MODIFIEDBY, DATEMODIFIED)
                VALUES (@referenceNo, @description, @budgetCode, @acct, @costCenterDetail, @locationDetail, @amount, @ewt, @createdBy, GETDATE(), @modifiedBy, GETDATE());
            `;
            for (const line of (lines || [])) {
                await connection.request()
                    .input('referenceNo', referenceNo)
                    .input('description', line.description)
                    .input('budgetCode', line.budgetCode)
                    .input('acct', line.acct)
                    .input('costCenterDetail', line.costCenter)
                    .input('locationDetail', line.location)
                    .input('amount', line.amount)
                    .input('ewt', line.ewt)
                    .input('createdBy', createdBy || modifiedBy)
                    .input('modifiedBy', modifiedBy)
                    .query(detailQuery);
            }

            return { success: true, message: 'RFP details updated successfully' };
        } catch (error) {
            console.error('Error updating RFP details:', error);
            return { success: false, message: 'Failed to update RFP details' };
        }
    }
}

export default NO_PO_RFP;