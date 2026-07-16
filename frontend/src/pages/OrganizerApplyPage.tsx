import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { CatalogShell } from '../components/layout/CatalogShell';
import { Badge, Button, Card, Input, Spinner, Textarea } from '../components/ui';
import { applyAsOrganizer, getMyOrganizerApplication } from '../lib/catalog-api';

export default function OrganizerApplyPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const applicationQuery = useQuery({
    queryKey: ['my-organizer-application'],
    queryFn: getMyOrganizerApplication,
  });
  const applyMutation = useMutation({
    mutationFn: applyAsOrganizer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-organizer-application'] });
    },
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      await applyMutation.mutateAsync({
        businessName: String(data.get('businessName')).trim(),
        phone: String(data.get('phone')).trim(),
        documents: String(data.get('documents'))
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'Could not submit the application.',
      );
    }
  };

  return (
    <CatalogShell>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8">
        <Link className="text-sm font-semibold text-brand" to="/account">
          ← Back to account
        </Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Become an organizer</h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted">
          Apply to manage theaters, screens, layouts, and show listings on Book My Show.
        </p>
        {applicationQuery.isLoading ? (
          <div className="grid min-h-64 place-items-center">
            <Spinner label="Checking application" />
          </div>
        ) : null}
        {applicationQuery.data ? <ApplicationState application={applicationQuery.data} /> : null}
        {!applicationQuery.isLoading &&
        (!applicationQuery.data || applicationQuery.data.status === 'rejected') ? (
          <Card className="mt-8 p-6 sm:p-8">
            <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
              <Input label="Business name" name="businessName" required />
              <Input label="Business phone" name="phone" required type="tel" />
              <Textarea
                hint="Optional: one public document URL per line."
                label="Document links"
                name="documents"
              />
              {error ? (
                <p className="rounded bg-brand-soft p-3 text-sm text-brand" role="alert">
                  {error}
                </p>
              ) : null}
              <Button disabled={applyMutation.isPending} type="submit">
                {applyMutation.isPending
                  ? 'Submitting…'
                  : applicationQuery.data?.status === 'rejected'
                    ? 'Resubmit application'
                    : 'Submit application'}
              </Button>
            </form>
          </Card>
        ) : null}
      </main>
    </CatalogShell>
  );
}

function ApplicationState({
  application,
}: {
  application: NonNullable<Awaited<ReturnType<typeof getMyOrganizerApplication>>>;
}) {
  return (
    <Card className="mt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{application.businessName}</h2>
          <p className="mt-2 text-sm text-muted">
            Submitted {new Date(application.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge
          className={application.status === 'rejected' ? 'bg-brand-soft text-brand' : undefined}
          variant={application.status === 'approved' ? 'nowShowing' : 'comingSoon'}
        >
          {application.status}
        </Badge>
      </div>
      <p className="mt-6 text-sm leading-6 text-muted">
        {application.status === 'pending'
          ? 'Your application is in the admin review queue. You will receive organizer access after approval and your next session refresh.'
          : application.status === 'approved'
            ? 'Approved. Refresh your session to open the organizer workspace.'
            : (application.reviewNote ??
              'The application was not approved. Update the details below and resubmit.')}
      </p>
    </Card>
  );
}
